import { describe, expect, it } from 'vitest';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { hitWall, isRestWall, wallStand, type LocalBox, type WallStand } from './restWalls';
import { placementMatrix } from '../render/propBatchRules';

/** Boxes measured off Season 6 models (node space, Y up, tiles). */
const IRON_FENCE: LocalBox = { min: { x: -0.5, y: 0, z: -0.03 }, max: { x: 0.5, y: 2.2, z: 0.03 } }; // Lorencia SteelWall03
const LONG_FENCE: LocalBox = { min: { x: -2, y: 0, z: -0.03 }, max: { x: 2, y: 2.2, z: 0.03 } }; // SteelWall02
const WOOD_FENCE: LocalBox = { min: { x: -0.89, y: 0, z: -0.09 }, max: { x: 0.89, y: 1.01, z: 0.12 } }; // Fence01
const STONE_WALL: LocalBox = { min: { x: -2.98, y: 0, z: -0.84 }, max: { x: 2.97, y: 6.24, z: 0.89 } }; // StoneWall01
const POST: LocalBox = { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.03, y: 2.47, z: 0.04 } }; // SteelWall01
const TREE: LocalBox = { min: { x: -4.08, y: 0, z: -3.29 }, max: { x: 3.44, y: 8.25, z: 2.79 } }; // Tree01
const STATUE: LocalBox = { min: { x: -0.66, y: 0, z: -0.65 }, max: { x: 0.66, y: 3.22, z: 0.67 } }; // SteelStatue01
const CURB: LocalBox = { min: { x: -1, y: 0, z: -0.07 }, max: { x: 1, y: 0.23, z: 0.2 } }; // Fence03
const HANGING: LocalBox = { min: { x: -0.06, y: 2.71, z: -0.06 }, max: { x: 0.21, y: 4.62, z: 0.89 } }; // Devias 85

function at(x: number, z: number, yaw = 0, scale = 1): Matrix {
  return placementMatrix({ pos: { x, y: 0, z }, rot: { x: 0, y: yaw, z: 0 }, scale }, new Matrix());
}

/** The direction `transform.rot.y` faces (atan2(dz, dx) + pi/2). */
function facing(rotY: number): { x: number; z: number } {
  return { x: Math.cos(rotY - Math.PI / 2), z: Math.sin(rotY - Math.PI / 2) };
}

describe('which objects are walls', () => {
  it('takes long, thin, upright boxes', () => {
    for (const box of [IRON_FENCE, LONG_FENCE, WOOD_FENCE, STONE_WALL]) expect(isRestWall(box, 1)).toBe(true);
  });

  it('leaves out round, tiny, low and hanging ones', () => {
    for (const box of [POST, TREE, STATUE, CURB, HANGING]) expect(isRestWall(box, 1)).toBe(false);
  });

  it('measures at the placement scale', () => {
    expect(isRestWall(IRON_FENCE, 0.5)).toBe(false);
    expect(isRestWall(CURB, 5)).toBe(true);
  });
});

describe('a click on a wall', () => {
  const hit = new Vector3();

  it('enters the box above its ground', () => {
    const t = hitWall(IRON_FENCE, at(100, 50), { x: 100.2, y: 5, z: 50 }, { x: 0, y: -1, z: 0 }, hit);
    expect(t).toBeCloseTo(2.8);
    expect(hit.x).toBeCloseTo(0.2);
  });

  it('misses beside it and through a turned one', () => {
    expect(hitWall(IRON_FENCE, at(100, 50), { x: 100, y: 5, z: 50.5 }, { x: 0, y: -1, z: 0 }, hit)).toBe(-1);
    expect(hitWall(IRON_FENCE, at(100, 50, Math.PI / 2), { x: 100.4, y: 5, z: 50 }, { x: 0, y: -1, z: 0 }, hit)).toBe(-1);
  });
});

describe('where the hero leans', () => {
  const out: WallStand = { x: 0, y: 0, rotY: 0 };
  const hit = new Vector3();

  it('stands beside the clicked point on his side, facing away', () => {
    // The fence runs along x on the line z = 50; tile row 50 is its wall.
    const walk = (_x: number, y: number) => y !== 50 && y !== 49;
    hit.set(0.2, 1, 0);
    expect(wallStand(IRON_FENCE, at(100, 50), hit, 100.5, 54.5, walk, out)).toBe(true);
    expect(out).toMatchObject({ x: 100, y: 51 });
    const f = facing(out.rotY);
    expect(f.x).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(1);

    expect(wallStand(IRON_FENCE, at(100, 50), hit, 100.5, 44.5, walk, out)).toBe(true);
    expect(out).toMatchObject({ x: 100, y: 48 });
    expect(facing(out.rotY).z).toBeCloseTo(-1);
  });

  it('turns with the wall', () => {
    // Turned a quarter, the fence runs along z on the line x = 100.
    const walk = (x: number) => x !== 99 && x !== 100;
    hit.set(0.2, 1, 0);
    expect(wallStand(IRON_FENCE, at(100, 50, Math.PI / 2), hit, 104.5, 50.5, walk, out)).toBe(true);
    expect(out.x).toBe(101);
    expect(Math.abs(out.y - 50)).toBeLessThanOrEqual(1);
    const f = facing(out.rotY);
    expect(f.x).toBeCloseTo(1);
    expect(f.z).toBeCloseTo(0);
  });

  it('takes the far side when his own is blocked', () => {
    const walk = (_x: number, y: number) => y < 49;
    hit.set(0, 1, 0);
    expect(wallStand(IRON_FENCE, at(100, 50), hit, 100.5, 54.5, walk, out)).toBe(true);
    expect(out.y).toBe(48);
    expect(facing(out.rotY).z).toBeCloseTo(-1);
  });

  it('keeps to the wall ends', () => {
    const walk = (_x: number, y: number) => y !== 50 && y !== 49;
    hit.set(1.7, 1, 0); // past a short fence's end (the ray entered a neighbour's box)
    expect(wallStand(IRON_FENCE, at(100, 50), hit, 100.5, 54.5, walk, out)).toBe(true);
    expect(out.x).toBe(100);
  });

  it('refuses a wall on open ground, such as a bridge rail or a sign', () => {
    hit.set(0, 1, 0);
    expect(wallStand(IRON_FENCE, at(100, 50), hit, 100.5, 54.5, () => true, out)).toBe(false);
  });

  it('refuses when no tile beside it is free', () => {
    hit.set(0, 1, 0);
    expect(wallStand(IRON_FENCE, at(100, 50), hit, 100.5, 54.5, () => false, out)).toBe(false);
  });
});
