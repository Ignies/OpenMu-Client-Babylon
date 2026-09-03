import { describe, expect, it } from 'vitest';
import {
  AMBIENT_WAVE_AMPLITUDE,
  AMBIENT_WAVE_DAMPING,
  AMBIENT_WAVE_INTERVAL,
  AMBIENT_WAVE_SPEED,
  waterSurfaceHeight,
} from './terrainWater';

describe('terrainWater surface', () => {
  it('is a pure function of time and position', () => {
    const a = waterSurfaceHeight(37.25, 224.5, 12.8);
    const b = waterSurfaceHeight(37.25, 224.5, 12.8);
    expect(a).toBe(b);
    expect(a).not.toBe(waterSurfaceHeight(37.25, 224.5, 12.9));
  });

  it('carries the CSWaterTerrain base-wave constants', () => {
    // calcBaseWave with T ms, i = 2z, j = 2x, amplitudes 50/25, surface
    // weight 0.25, heights /100 - computed by hand for x=10, z=20, t=3.
    const x = 10;
    const z = 20;
    const t = 3;
    const expected =
      0.125 * Math.sin(t * 5 + z * 0.2 + x * 0.2) -
      0.125 * Math.sin(t * 3 + x * 0.2 + z) +
      0.0625 * Math.sin(t + z + x) -
      0.0625 * Math.sin(t * 2 + x * 2 + z * 0.6);
    expect(waterSurfaceHeight(x, z, t)).toBeCloseTo(expected, 12);
  });

  it('stays inside the ported amplitude bound', () => {
    // 0.125 + 0.125 + 0.0625 + 0.0625 tiles = 37.5 original units.
    for (let i = 0; i < 500; i++) {
      const h = waterSurfaceHeight(i * 0.37, i * 0.73, i * 0.11);
      expect(Math.abs(h)).toBeLessThanOrEqual(0.375);
    }
  });

  it('ambient ring expands at the automaton speed and damps out', () => {
    const ring = { x: 0, z: 0, spawnTime: 0 };
    const t = 0.8;
    const front = AMBIENT_WAVE_SPEED * t;

    const onFront =
      waterSurfaceHeight(front, 0, t, [ring]) - waterSurfaceHeight(front, 0, t);
    const offFront =
      waterSurfaceHeight(front + 6, 0, t, [ring]) -
      waterSurfaceHeight(front + 6, 0, t);
    expect(Math.abs(onFront)).toBeGreaterThan(Math.abs(offFront));

    // Peak at the front: amplitude x damping x cylindrical spreading.
    const peak =
      (AMBIENT_WAVE_AMPLITUDE * Math.exp(-AMBIENT_WAVE_DAMPING * t)) /
      Math.sqrt(front);
    expect(onFront).toBeCloseTo(peak, 12);

    // Before its spawn a ring contributes nothing.
    expect(waterSurfaceHeight(5, 5, 1, [{ x: 5, z: 5, spawnTime: 2 }])).toBe(
      waterSurfaceHeight(5, 5, 1)
    );

    // By the time a slot is reused (3 spawns later) the wave is gone.
    const reuse = 3 * AMBIENT_WAVE_INTERVAL;
    const stale =
      waterSurfaceHeight(AMBIENT_WAVE_SPEED * reuse, 0, reuse, [ring]) -
      waterSurfaceHeight(AMBIENT_WAVE_SPEED * reuse, 0, reuse);
    expect(Math.abs(stale)).toBeLessThan(0.001);
  });
});
