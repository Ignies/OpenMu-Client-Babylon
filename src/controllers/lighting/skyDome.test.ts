import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '../render/babylon/exports';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/** The `out` each `toLinear` call was handed. */
const outs = vi.hoisted(() => [] as unknown[]);
vi.mock('./profiles', async importOriginal => {
  const real = await importOriginal<typeof import('./profiles')>();
  return {
    ...real,
    toLinear: (c: readonly [number, number, number], out?: [number, number, number]) => {
      outs.push(out);
      return real.toLinear(c, out);
    },
  };
});

const { floorDeepFor, syncSkyDome } = await import('./skyDome');
const { profileFor } = await import('./profiles');
const { ENUM_WORLD } = await import('../../core/types');
type World = (typeof ENUM_WORLD)[keyof typeof ENUM_WORLD];

// The director sets the clear colour every tick (lighting/director.ts): decoded into kept buffers.
describe('the clear colour', () => {
  it('decodes the horizon and the map bytes without a fresh array a tick', () => {
    const set = vi.fn();
    const scene = { clearColor: { set } } as unknown as Scene;
    syncSkyDome(scene, { horizon: [0.5, 0.25, 1], linear: true, bytes: undefined, black: false });
    syncSkyDome(scene, { horizon: null, linear: true, bytes: [128, 64, 256], black: false });

    expect(outs).toHaveLength(2);
    expect(outs.every(Array.isArray)).toBe(true);
    const [horizon, bytes] = set.mock.calls;
    [0.5 ** 2.2, 0.25 ** 2.2, 1, 1].forEach((v, i) => expect(horizon[i]).toBeCloseTo(v));
    [0.5 ** 2.2, 0.25 ** 2.2, 1, 1].forEach((v, i) => expect(bytes[i]).toBeCloseTo(v));
  });
});

// The original clears every open map's void to black or near it; Devias' floor drew it so, Kanturu showed its pale horizon.
describe('the sky floor', () => {
  it('is black below the horizon on every map with a sky', () => {
    const worlds = Object.values(ENUM_WORLD).filter((w): w is World => typeof w === 'number' && !!profileFor(w).sky);
    expect(worlds).toContain(ENUM_WORLD.WD_37KANTURU_1ST);
    for (const world of worlds) expect([world, floorDeepFor(world)]).toEqual([world, [0, 0, 0]]);
  });
});
