import { describe, expect, it } from 'vitest';
import { Matrix, Vector3 } from '../libs/babylon/exports';
import {
  CHUNKS_PER_SIDE,
  CHUNK_TILES,
  batchExclusion,
  chunkOf,
  extendByBox,
  instanceMatrix,
  placementMatrix,
} from './propBatchRules';
import type { ModelObject } from './modelObject';

const factory = (batchable: boolean) =>
  ({ Batchable: batchable }) as unknown as typeof ModelObject;

describe('batchExclusion', () => {
  it('keeps an unmarked class on the per-object path', () => {
    expect(batchExclusion(factory(false), null)).toBe('class');
  });

  it('passes the table verdict through for a marked class', () => {
    expect(batchExclusion(factory(true), null)).toBeNull();
    expect(batchExclusion(factory(true), 'light')).toBe('light');
  });
});

describe('chunkOf', () => {
  it('tiles the map in CHUNK_TILES squares, row-major', () => {
    expect(chunkOf(0, 0)).toBe(0);
    expect(chunkOf(CHUNK_TILES - 0.01, 0)).toBe(0);
    expect(chunkOf(CHUNK_TILES, 0)).toBe(1);
    expect(chunkOf(0, CHUNK_TILES)).toBe(CHUNKS_PER_SIDE);
    expect(chunkOf(CHUNK_TILES * 3 + 5, CHUNK_TILES * 2 + 1)).toBe(
      2 * CHUNKS_PER_SIDE + 3
    );
  });

  it('clamps positions off the map to the edge chunks', () => {
    expect(chunkOf(-5, -5)).toBe(0);
    expect(chunkOf(10000, 10000)).toBe(CHUNKS_PER_SIDE * CHUNKS_PER_SIDE - 1);
  });
});

describe('placementMatrix', () => {
  const p = { pos: { x: 10, y: 1, z: 20 }, rot: { x: 0, y: 0, z: 0 }, scale: 2 };

  it('places the origin at the record position, scaled', () => {
    const m = placementMatrix(p, new Matrix());
    const at = Vector3.TransformCoordinates(new Vector3(1, 0, 0), m);
    expect(at.x).toBeCloseTo(12);
    expect(at.y).toBeCloseTo(1);
    expect(at.z).toBeCloseTo(20);
  });

  it('applies the y offset to the translation only', () => {
    const m = placementMatrix(p, new Matrix(), -0.25);
    expect(m.getTranslation().y).toBeCloseTo(0.75);
  });

  it('turns a yaw into a rotation about y that keeps lengths', () => {
    const yawed = { ...p, rot: { x: 0, y: Math.PI / 2, z: 0 } };
    const m = placementMatrix(yawed, new Matrix());
    const at = Vector3.TransformCoordinates(new Vector3(1, 0, 0), m);
    expect(at.y).toBeCloseTo(1);
    expect(Math.hypot(at.x - 10, at.z - 20)).toBeCloseTo(2);
    expect(Math.abs(at.x - 10)).toBeLessThan(1e-6);
  });
});

describe('instanceMatrix', () => {
  it('is the placement when the submesh sits at its root', () => {
    const node = placementMatrix(
      { pos: { x: 3, y: 0, z: 4 }, rot: { x: 0, y: 1, z: 0 }, scale: 1.5 },
      new Matrix()
    );
    const out = instanceMatrix(Matrix.Identity(), node, new Matrix());
    expect(out.equals(node)).toBe(true);
  });

  it('applies the submesh transform before the placement', () => {
    const lift = Matrix.Translation(0, 1, 0);
    const node = Matrix.Scaling(2, 2, 2);
    const out = instanceMatrix(lift, node, new Matrix());
    // lifted by one in mesh space, then scaled: lands at y = 2
    expect(out.getTranslation().y).toBeCloseTo(2);
  });
});

describe('extendByBox', () => {
  it('grows the bounds by every transformed corner', () => {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    const m = Matrix.Translation(10, 0, 0).multiply(Matrix.Scaling(1, 1, 1));
    extendByBox(new Vector3(-1, 0, -1), new Vector3(1, 2, 1), m, min, max);
    expect(min.x).toBeCloseTo(9);
    expect(max.x).toBeCloseTo(11);
    expect(min.y).toBeCloseTo(0);
    expect(max.y).toBeCloseTo(2);
  });
});
