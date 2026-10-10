import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import type { Entity, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { ItemPickupSystem } = await import('./itemPickupSystem');
const { Drops } = await import('../../modules/drops');

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

describe('the pickup request', () => {
  it('marks the drop asked for, which the MU Helper then leaves alone (DeleteItem, MuHelper.cpp:1252)', () => {
    const drop = {
      netId: 5,
      worldIndex: 0,
      transform: { pos: { x: 11, z: 10 } },
      droppedItem: { isMoney: false, group: 14, num: 0 },
    } as unknown as Entity;
    const world = {
      scene,
      mapIndex: 0,
      playerEntity: { transform: { pos: { x: 10, z: 10 } }, pathfinding: { path: null } },
      pickupTarget: drop,
      has: () => true,
    } as unknown as World;
    const asked = vi.spyOn(Drops, 'pickupItemRequest').mockImplementation(() => {});
    ItemPickupSystem(world).update?.(0.04);
    expect(asked).toHaveBeenCalledWith(5);
    expect(drop.droppedItem?.pickupAsked).toBe(true);
    expect(world.pickupTarget).toBeNull();
  });
});
