import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Entity, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/** The kick's sound and sparks, recorded. */
const kick = vi.hoisted(() => ({ sounds: [] as string[], bombs: [] as boolean[] }));
vi.mock('@/controllers/sound/sfx', async importOriginal => ({
  ...(await importOriginal<typeof import('@/controllers/sound/sfx')>()),
  playUiSound: (name: string) => void kick.sounds.push(name),
}));
vi.mock('@/controllers/fx/deathVisuals', async importOriginal => ({
  ...(await importOriginal<typeof import('@/controllers/fx/deathVisuals')>()),
  spawnBomb: (_scene: unknown, _at: unknown, explosion = true) => void kick.bombs.push(explosion),
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Ecs } = await import('@/ecs/current');
const { installNet } = await import('@/modules/scope/net');
const { ObjectMovedPacket } = await import('@versions/shared/packets/ServerToClientPackets');
const { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } = await import('@/controllers/fidelity');
const { ENUM_WORLD } = await import('@/core/types');
const { MonsterActionType, PlayerAction } = await import('@versions/shared/objects/enum');
const { PositionSlideSystem, isSliding } = await import('./positionSlideSystem');

installNet();

const TICK = 1 / 25;
const CHAOS_CASTLE = ENUM_WORLD.WD_18CHAOS_CASTLE;

/** A body standing on (100, 100) on flat ground, in a world on `map`; a player is drawn at its tile centre. */
function standing(extra: Partial<Entity> = {}, map = 0, player = true) {
  const centre = new Vector3(0.5, 0, 0.5);
  const body = {
    netId: 9,
    transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(), scale: 1, posOffset: player ? centre : undefined },
    ...extra,
  } as unknown as Entity;
  const world = {
    mapIndex: map,
    scene: {},
    getByNetId: () => body,
    getTerrainHeight: () => 0,
    attackTarget: null,
    castApproach: null,
    with: () => (body.ball ? [body] : []),
  } as unknown as World;
  runInAction(() => (Ecs.world = world));
  return { body, t: body.transform as NonNullable<Entity['transform']>, centre, system: PositionSlideSystem(world) };
}

/** The server puts object 9 on (x, y) at once (`ObjectMoved`, C1 15). */
function moveTo(x: number, y: number): void {
  const p = ObjectMovedPacket.createPacket();
  p.ObjectId = 9;
  p.PositionX = x;
  p.PositionY = y;
  EventBus.emit('ObjectMoved', p.buffer);
}

const ticks = (system: ReturnType<typeof PositionSlideSystem>, n: number) => {
  for (let i = 0; i < n; i++) system.update?.(TICK);
};

// ReceiveMovePosition's JumpTime and PushingCharacter (WSclient.cpp:2127-2153, ZzzCharacter.cpp:3144-3203).
describe("the server's instant move", () => {
  afterEach(() => {
    setFidelityChoice(FIDELITY_DEFAULT, {});
    runInAction(() => (Ecs.world = null));
    kick.sounds.length = 0;
    kick.bombs.length = 0;
  });

  it('lands the tile at once and draws the body a fifth closer each tick, on it after 15', () => {
    const { t, centre, system } = standing();
    moveTo(103, 100);
    expect(t.pos.x).toBe(103);
    expect(t.posOffset?.x).toBeCloseTo(0.5 - 3);

    system.update?.(TICK);
    expect(t.posOffset?.x).toBeCloseTo(0.5 - 3 * 0.8);
    ticks(system, 14);
    expect(t.posOffset).toBe(centre);
    expect(centre.x).toBe(0.5);
  });

  it('slides on Classic too, whatever the distance', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    const { t } = standing();
    moveTo(100, 120);
    expect(t.posOffset?.z).toBeCloseTo(0.5 - 20);
  });

  it('holds the hero for the 15 ticks, even when the tile does not change (JumpTime > 0)', () => {
    const { body, system } = standing();
    moveTo(100, 100);
    expect(isSliding(body)).toBe(true);
    ticks(system, 14);
    expect(isSliding(body)).toBe(true);
    ticks(system, 1);
    expect(isSliding(body)).toBe(false);
  });

  it('in Chaos Castle aims at the tile corner at its own height, stops there, and leaves it walking', () => {
    const playerAnimation = { action: PlayerAction.PLAYER_ATTACK_FIST, run: 40 };
    const { body, t, centre, system } = standing({ playerAnimation } as Partial<Entity>, CHAOS_CASTLE);
    moveTo(103, 100);
    system.update?.(TICK);
    expect(t.posOffset?.x).toBeCloseTo(0 + (0.5 - 3) * 0.8);
    ticks(system, 14);
    expect(t.posOffset?.x).toBe(0);
    expect(t.posOffset?.z).toBe(0);
    expect(isSliding(body)).toBe(false);
    // SetPlayerStop: the stop clip (the animation system picks the class's own) and Run 0.
    expect(playerAnimation).toEqual({ action: PlayerAction.PLAYER_STOP_MALE, run: 0 });

    t.pos.x = 103.5;
    system.update?.(TICK);
    expect(t.posOffset?.x).toBeCloseTo(0.25);
    t.pos.x = 104;
    system.update?.(TICK);
    expect(t.posOffset).toBe(centre);
  });

  it('slides a Crust at 0.07 a tick and stops it on the tile', () => {
    const monsterAnimation = { action: MonsterActionType.Attack1 };
    const { t, system } = standing({ npcType: 71, monsterAnimation } as Partial<Entity>, 0, false);
    moveTo(103, 100);
    system.update?.(TICK);
    expect(t.posOffset?.x).toBeCloseTo(-3 * 0.93);
    ticks(system, 14);
    expect(t.posOffset).toBeUndefined();
    expect(monsterAnimation.action).toBe(MonsterActionType.Stop1);
  });

  it('kicks the ball: sparks, SOUND_MENU01, a hop off its 30 cm floor and a roll that fades', () => {
    const ball = { height: 0, gravity: 0, spinX: 0, spinZ: 0, ticks: 0 };
    const modelObject = { HoverHeight: 0 };
    const { t, system } = standing({ npcType: 200, ball, modelObject } as unknown as Partial<Entity>, 0, false);
    system.update?.(TICK);
    expect(modelObject.HoverHeight).toBeCloseTo(0.3);

    moveTo(102, 100);
    expect(kick.sounds).toEqual(['menuMove']);
    expect(kick.bombs).toEqual([false]);
    system.update?.(TICK);
    expect(modelObject.HoverHeight).toBeCloseTo(0.5);
    // Direction[1] = (X - PositionX) * 400 degrees, once a tick.
    expect(t.rot.z).toBeCloseTo((800 * Math.PI) / 180);

    // Back to the hop of a few cm the floor never quite stops; the roll is gone.
    ticks(system, 60);
    expect(ball.height).toBeLessThan(10);
    expect(modelObject.HoverHeight).toBeLessThan(0.4);
    expect(ball).toMatchObject({ spinX: 0, spinZ: 0 });
  });
});
