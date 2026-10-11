import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Entity, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/** The Begin / End flashes drawn, in order. */
const flashes = vi.hoisted(() => [] as string[]);
vi.mock('@versions/shared/skills/dark_wizard/teleport', async importOriginal => ({
  ...(await importOriginal<typeof import('@versions/shared/skills/dark_wizard/teleport')>()),
  playTeleportFlash: (_scene: unknown, _skill: number, _e: unknown, moment: string) => void flashes.push(moment),
}));
vi.mock('@/controllers/sound/sfx', async importOriginal => ({
  ...(await importOriginal<typeof import('@/controllers/sound/sfx')>()),
  playSfx: () => {},
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Ecs } = await import('@/ecs/current');
const { installNet } = await import('@/modules/warp/net');
const { teleportGate } = await import('@/modules/warp/teleportRules');
const { MapChangedPacket } = await import('@versions/shared/packets/ServerToClientPackets');
const { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } = await import('@/controllers/fidelity');
const { TeleportSystem, beginTeleport, cancelTeleport } = await import('./teleportSystem');

installNet();

const TICK = 1 / 25;
const TELEPORT = 6;

/** The hero on (100, 100) of a flat world; `alpha` is what he is drawn at. */
function heroWorld() {
  const model = {
    Ready: true,
    Alpha: 1,
    alpha: 1,
    AnimationSpeed: 1,
    CurrentAction: 0,
    actionPlaySpeed: () => 1,
    restartAction() {},
    seekActionFrame() {},
    setFadeAlpha(a: number) {
      this.alpha = a;
    },
  };
  const pos = new Vector3(100, 0, 100);
  const hero = {
    localPlayer: true,
    transform: { pos, rot: new Vector3(), scale: 1 },
    pathfinding: { path: null, from: { x: 100, y: 100 }, to: { x: 100, y: 100 } },
    playerAnimation: { action: 0 },
    modelObject: model,
  } as unknown as Entity;
  // A class instance: mobx keeps it as it is, so `Ecs.world.playerEntity` is this hero, not a copy.
  const world = Object.assign(new (class FakeWorld {})(), {
    scene: {},
    playerEntity: hero,
    attackTarget: null,
    castApproach: null,
    has: () => true,
    addComponent() {},
    getTerrainHeight: () => 0,
  }) as unknown as World;
  runInAction(() => (Ecs.world = world));
  const update = TeleportSystem(world).update as (dt: number) => void;
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += TICK) update(TICK);
  };
  return { hero, model, pos, run };
}

/** The hero asks for (105, 100): the request goes out and Begin plays. */
function cast(hero: Entity): void {
  const from = { x: 100, y: 100 };
  const to = { x: 105, y: 100 };
  teleportGate.begin(from, to, performance.now() / 1000);
  beginTeleport(hero, TELEPORT, { move: to });
}

/** OpenMU's answer: a same-map MapChanged on (105, 100). */
function serverAnswers(): void {
  const p = MapChangedPacket.createPacket();
  p.PositionX = 105;
  p.PositionY = 100;
  EventBus.emit('MapChanged', p.buffer);
}

afterEach(() => {
  const hero = Ecs.world?.playerEntity;
  if (hero) cancelTeleport(hero);
  teleportGate.reset();
  flashes.length = 0;
  setFidelityChoice(FIDELITY_DEFAULT, {});
  runInAction(() => (Ecs.world = null));
});

describe("the hero's own Teleport", () => {
  // CreateTeleportBegin, then nothing until ReceiveTeleport: position, CreateTeleportEnd (WSclient.cpp:2157-2197).
  it('waits faded on the old square for the server on Classic, then lands and plays End', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    const { hero, model, pos, run } = heroWorld();
    cast(hero);
    run(1);
    expect([pos.x, pos.z]).toEqual([100, 100]);
    expect(model.alpha).toBe(0);
    expect(flashes).toEqual(['begin']);

    serverAnswers();
    expect([pos.x, pos.z]).toEqual([105, 100]);
    expect(flashes).toEqual(['begin', 'end']);
    run(1);
    expect(model.alpha).toBe(1);
  });

  it('lands before the answer with teleportLandsEarly, and the answer moves nothing', () => {
    const { hero, pos, run } = heroWorld();
    cast(hero);
    run(0.3);
    expect([pos.x, pos.z]).toEqual([105, 100]);
    expect(flashes).toEqual(['begin', 'end']);

    serverAnswers();
    expect([pos.x, pos.z]).toEqual([105, 100]);
    expect(flashes).toEqual(['begin', 'end']);
  });
});
