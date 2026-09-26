import { describe, expect, it } from 'vitest';
import { TERRAIN_SIZE } from './terrain/consts';
import {
  initTerrainDynamicLight,
  registerTerrainLight,
  requestBakedTerrainLight,
  requestBodyTerrainLight,
  requestTerrainLight,
  terrainLightTouchedVersion,
  terrainLightTouchesSample,
  updateTerrainDynamicLight,
  type TerrainLightEmitter,
} from './terrainDynamicLight';

function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bakedField(random: () => number): Float32Array {
  const field = new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE * 3);
  for (let i = 0; i < field.length; i++) field[i] = 0.05 + random();
  return field;
}

function emitter(
  x: number,
  z: number,
  range: number,
  color = { r: 0.8, g: 0.5, b: 0.2 }
): TerrainLightEmitter & { position: { x: number; y: number; z: number } } {
  return { position: { x, y: 0, z }, range, color: () => color };
}

/** The bilinear sample as it was written before the per-channel closure was hoisted. */
function referenceSample(field: Float32Array, x: number, y: number): number[] {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const i1 = (yi * TERRAIN_SIZE + xi) * 3;
  const i2 = (yi * TERRAIN_SIZE + xi + 1) * 3;
  const i3 = ((yi + 1) * TERRAIN_SIZE + xi + 1) * 3;
  const i4 = ((yi + 1) * TERRAIN_SIZE + xi) * 3;
  const xd = x - xi;
  const yd = y - yi;

  const channel = (c: number) => {
    const left = field[i1 + c] + (field[i4 + c] - field[i1 + c]) * yd;
    const right = field[i2 + c] + (field[i3 + c] - field[i2 + c]) * yd;

    return left + (right - left) * xd;
  };

  return [channel(0), channel(1), channel(2)];
}

describe('terrainLightTouchesSample', () => {
  it('is false wherever the lit fields still equal the bake', () => {
    const random = rng(7);
    const baked = bakedField(random);
    initTerrainDynamicLight(baked);

    const disposers = [
      registerTerrainLight(emitter(40.3, 52.8, 3)),
      registerTerrainLight(emitter(47.9, 50.1, 2)),
      registerTerrainLight(emitter(120.5, 200.5, 5)),
    ];
    updateTerrainDynamicLight(1000);

    const lit = { x: 0, y: 0, z: 0 };
    const body = { x: 0, y: 0, z: 0 };
    const bake = { x: 0, y: 0, z: 0 };
    let touchedDiffers = 0;

    for (let n = 0; n < 20000; n++) {
      const x = 30 + random() * 30;
      const z = 40 + random() * 25;

      requestTerrainLight(x, z, lit);
      requestBodyTerrainLight(x, z, body);
      requestBakedTerrainLight(x, z, bake);

      if (terrainLightTouchesSample(x, z)) {
        if (lit.x !== bake.x || lit.y !== bake.y || lit.z !== bake.z) {
          touchedDiffers++;
        }
        continue;
      }

      expect([lit.x, lit.y, lit.z]).toEqual([bake.x, bake.y, bake.z]);
      expect([body.x, body.y, body.z]).toEqual([bake.x, bake.y, bake.z]);
    }

    expect(touchedDiffers).toBeGreaterThan(0);
    expect(terrainLightTouchesSample(40, 52)).toBe(true);
    expect(terrainLightTouchesSample(10, 10)).toBe(false);

    for (const dispose of disposers) dispose();
    updateTerrainDynamicLight(1016);
  });

  it('numbers every change of the set, idling included', () => {
    initTerrainDynamicLight(bakedField(rng(3)));
    updateTerrainDynamicLight(0);

    const idle = terrainLightTouchedVersion();
    const torch = emitter(60.2, 60.2, 2);
    const dispose = registerTerrainLight(torch);

    updateTerrainDynamicLight(16);
    const lit = terrainLightTouchedVersion();
    expect(lit).not.toBe(idle);
    expect(terrainLightTouchesSample(60, 60)).toBe(true);

    // Within its tile the set holds.
    torch.position.x = 60.7;
    updateTerrainDynamicLight(32);
    expect(terrainLightTouchedVersion()).toBe(lit);

    // Across a tile it is rebuilt.
    torch.position.x = 64.1;
    updateTerrainDynamicLight(48);
    const moved = terrainLightTouchedVersion();
    expect(moved).not.toBe(lit);
    expect(terrainLightTouchesSample(64, 60)).toBe(true);
    expect(terrainLightTouchesSample(57, 60)).toBe(false);

    // Switched off: nothing is touched.
    updateTerrainDynamicLight(64, false);
    expect(terrainLightTouchedVersion()).not.toBe(moved);
    expect(terrainLightTouchesSample(64, 60)).toBe(false);

    dispose();
    updateTerrainDynamicLight(80);
  });
});

describe('the bilinear sample', () => {
  it('matches the per-channel closure it replaced, bit for bit', () => {
    const random = rng(11);
    const baked = bakedField(random);
    initTerrainDynamicLight(baked);

    const out = { x: 0, y: 0, z: 0 };

    for (let n = 0; n < 5000; n++) {
      const x = random() * (TERRAIN_SIZE - 1);
      const z = random() * (TERRAIN_SIZE - 1);

      expect(requestBakedTerrainLight(x, z, out)).toBe(true);
      expect([out.x, out.y, out.z]).toEqual(referenceSample(baked, x, z));
    }
  });
});
