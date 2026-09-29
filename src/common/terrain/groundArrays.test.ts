import { describe, expect, it } from 'vitest';
import { buildGroundArrays, refreshGroundTile } from './groundArrays';
import { TERRAIN_SIZE, TWFlags } from './consts';

const N = TERRAIN_SIZE;

function heights(): Float32Array {
  const height = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      height[y * N + x] = 2 + Math.sin(x * 0.3) + Math.cos(y * 0.2);
    }
  }
  return height;
}

function build(height: Float32Array, flags: Uint16Array) {
  return buildGroundArrays(
    height,
    flags,
    new Uint8Array(N * N),
    new Uint8Array(N * N).fill(255),
    new Uint8Array(N * N),
    new Float32Array(0),
    0
  );
}

/** The twelve floats of tile (x, y) in a positions or normals array. */
function tile(values: Float32Array, x: number, y: number): number[] {
  const p = (y * N + x) * 12;
  return Array.from(values.subarray(p, p + 12));
}

describe('refreshGroundTile', () => {
  const height = heights();
  const tiles = [
    [13, 70],
    [14, 73],
    [N - 1, N - 1],
  ] as const;

  it('brings a tile back when its NoGround is cleared', () => {
    const flags = new Uint16Array(N * N);
    for (const [x, y] of tiles) flags[y * N + x] = TWFlags.NoGround;
    const ground = build(height, flags);

    for (const [x, y] of tiles) {
      flags[y * N + x] = 0;
      refreshGroundTile(ground.positions, ground.normals, height, flags, x, y);
    }

    const fresh = build(height, new Uint16Array(N * N));
    for (const [x, y] of tiles) {
      expect(tile(ground.positions, x, y)).toEqual(tile(fresh.positions, x, y));
      expect(tile(ground.normals, x, y)).toEqual(tile(fresh.normals, x, y));
    }
  });

  it('drops a tile out of sight when NoGround is set', () => {
    const flags = new Uint16Array(N * N);
    const ground = build(height, flags);

    for (const [x, y] of tiles) {
      flags[y * N + x] = TWFlags.NoGround | TWFlags.NoMove;
      refreshGroundTile(ground.positions, ground.normals, height, flags, x, y);
    }

    const fresh = build(height, flags);
    for (const [x, y] of tiles) {
      expect(tile(ground.positions, x, y)).toEqual(tile(fresh.positions, x, y));
      expect(tile(ground.normals, x, y)).toEqual(tile(fresh.normals, x, y));
    }
  });

  it('leaves the neighbouring tiles alone', () => {
    const flags = new Uint16Array(N * N);
    const ground = build(height, flags);
    const before = tile(ground.positions, 15, 70);

    flags[70 * N + 14] = TWFlags.NoGround;
    refreshGroundTile(ground.positions, ground.normals, height, flags, 14, 70);

    expect(tile(ground.positions, 15, 70)).toEqual(before);
  });
});
