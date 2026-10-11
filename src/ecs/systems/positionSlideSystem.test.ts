import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Entity, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { EventBus } = await import('@/core/eventBus');
const { Ecs } = await import('@/ecs/current');
const { installNet } = await import('@/modules/scope/net');
const { ObjectMovedPacket } = await import('@versions/shared/packets/ServerToClientPackets');
const { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } = await import('@/controllers/fidelity');
const { PositionSlideSystem } = await import('./positionSlideSystem');

installNet();

const TICK = 1 / 25;

/** A player standing on (100, 100), drawn at its tile centre, on flat ground. */
function standing() {
  const centre = new Vector3(0.5, 0, 0.5);
  const body = { netId: 9, transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(), scale: 1, posOffset: centre } } as unknown as Entity;
  const world = { getByNetId: () => body, getTerrainHeight: () => 0, attackTarget: null, castApproach: null } as unknown as World;
  runInAction(() => (Ecs.world = world));
  return { t: body.transform as NonNullable<Entity['transform']>, centre, system: PositionSlideSystem(world) };
}

/** The server puts object 9 on (x, y) at once (`ObjectMoved`, C1 15). */
function moveTo(x: number, y: number): void {
  const p = ObjectMovedPacket.createPacket();
  p.ObjectId = 9;
  p.PositionX = x;
  p.PositionY = y;
  EventBus.emit('ObjectMoved', p.buffer);
}

// ReceiveMovePosition's JumpTime and PushingCharacter (WSclient.cpp:2147, ZzzCharacter.cpp:3144-3190).
describe("the server's instant move", () => {
  afterEach(() => {
    setFidelityChoice(FIDELITY_DEFAULT, {});
    runInAction(() => (Ecs.world = null));
  });

  it('lands the tile at once and draws the body a fifth closer each tick, on it after 15', () => {
    const { t, centre, system } = standing();
    moveTo(103, 100);
    expect(t.pos.x).toBe(103);
    expect(t.posOffset?.x).toBeCloseTo(0.5 - 3);

    system.update?.(TICK);
    expect(t.posOffset?.x).toBeCloseTo(0.5 - 3 * 0.8);
    for (let i = 1; i < 15; i++) system.update?.(TICK);
    expect(t.posOffset).toBe(centre);
    expect(centre.x).toBe(0.5);
  });

  it('slides on Classic too, whatever the distance', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    const { t } = standing();
    moveTo(100, 120);
    expect(t.posOffset?.z).toBeCloseTo(0.5 - 20);
  });
});
