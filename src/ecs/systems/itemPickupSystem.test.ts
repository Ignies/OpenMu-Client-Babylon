import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import type { Entity, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { ItemPickupSystem, autoGetItem } = await import('./itemPickupSystem');
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

// CNewUIHotKey::AutoGetItem (NewUIHotKey.cpp:455-490): Space walks to the first live, drawn item
// less than 300 units (3 tiles) from the hero, in the order the client holds them.
describe('autoGetItem', () => {
  const drop = (x: number, z: number, extra: Partial<Entity> = {}) =>
    ({
      netId: x * 100 + z,
      worldIndex: 0,
      transform: { pos: { x, y: 0, z } },
      droppedItem: { isMoney: false, group: 14, num: 0 },
      visibility: { state: 'visible' },
      ...extra,
    }) as unknown as Entity;
  const worldWith = (...drops: Entity[]) =>
    ({
      scene,
      mapIndex: 0,
      playerEntity: { transform: { pos: { x: 10, y: 0, z: 10 } } },
      netObjsQuery: { entities: drops },
      pickupTarget: null,
    }) as unknown as World;

  it('takes the first item within 3 tiles, not the nearest', () => {
    const near = drop(11, 10);
    const first = drop(12, 11);
    const world = worldWith(drop(14, 10), first, near);
    expect(autoGetItem(world)).toBe(true);
    expect(world.pickupTarget).toBe(first);
  });

  it('leaves items 3 tiles away or out of sight', () => {
    const world = worldWith(drop(13, 10), drop(11, 10, { visibility: { state: 'hidden' } } as Partial<Entity>));
    expect(autoGetItem(world)).toBe(false);
    expect(world.pickupTarget).toBeNull();
  });
});
