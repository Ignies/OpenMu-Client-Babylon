import { afterEach, describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '../../core/types';
import { maps, type MapLayer } from '../maps';
import { LEAN_CURSOR_OBJECTS, findRestObject, leanCursorObjects } from './restObjects';
import { applyMapObjectFixups, mapObjectFixupsFor } from './mapObjectFixups';

// A world no real entry claims, served by a test entry.
const W = 230 as ENUM_WORLD;

const entry: MapLayer = {
  name: 'zzTerrain',
  worlds: [W],
  tiles: [],
  terrain: {
    rest: { 5: { kind: 'sit', useObjectAngle: true } },
    leanCursor: [5],
    objectFixups: [{ type: 9, x: 100, y: 200, z: 42 }],
  },
};

let unregister: (() => void) | null = null;
afterEach(() => {
  unregister?.();
  unregister = null;
});

describe("a map's terrain rows", () => {
  it('hide the ground of the sky map only', () => {
    expect(maps.worldsWhere(l => l.terrain?.hidden === true)).toEqual([ENUM_WORLD.WD_10ICARUS]);
  });

  it('give rest objects and lean boxes, live through the per-world record', () => {
    expect(LEAN_CURSOR_OBJECTS[W]).toBeUndefined();
    unregister = maps.register(entry);
    expect(findRestObject(W, 5)?.kind).toBe('sit');
    expect(findRestObject(W, 6)).toBeUndefined();
    expect(leanCursorObjects(W)?.has(5)).toBe(true);
    expect(LEAN_CURSOR_OBJECTS[W]).toBe(leanCursorObjects(W));
  });

  it('fix the height of the object nearest each row', () => {
    unregister = maps.register(entry);
    expect(mapObjectFixupsFor(W)).toHaveLength(1);
    const near = { id: 9, pos: { x: 100.2, y: 200, z: 0 } };
    const far = { id: 9, pos: { x: 150, y: 200, z: 0 } };
    applyMapObjectFixups(W, [far, near]);
    expect(near.pos.z).toBe(42);
    expect(far.pos.z).toBe(0);
  });
});
