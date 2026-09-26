import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Effect } from '../libs/babylon/exports';
import {
  CLOUD_ALT,
  CLOUD_THICK,
  bindCloudValues,
  cloudUniformValues,
  type CloudLook,
} from './clouds';

const look = (sunDirection: CloudLook['sunDirection']): CloudLook => ({
  base: null,
  sunDirection,
  sunElevationDeg: 45,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cloud uniform values', () => {
  it('are the same twelve floats for the same clock', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_758_000_000_123);

    const a = new Array(12).fill(-1);
    const b = new Array(12).fill(-2);
    cloudUniformValues(look([0.3, -0.5, 0.4]), a);
    cloudUniformValues(look([0.3, -0.5, 0.4]), b);

    expect(b).toEqual(a);
  });

  it('wrap the scroll offsets into [0, 1) and leave a skyless map clear', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_758_000_000_123);

    const v = new Array(12).fill(0);
    cloudUniformValues(look([0, -1, 0]), v);

    for (const i of [0, 1, 8, 9]) {
      expect(v[i]).toBeGreaterThanOrEqual(0);
      expect(v[i]).toBeLessThan(1);
    }
    expect(v[2]).toBe(0);
    expect(v[3]).toBe(0);
  });

  it('walk the sun step to the deck, capped for a grazing sun', () => {
    const v = new Array(12).fill(0);

    cloudUniformValues(look([0.3, -0.5, 0.4]), v);
    expect(v.slice(4, 8)).toEqual([
      -0.3 / 0.5,
      -0.4 / 0.5,
      CLOUD_ALT,
      CLOUD_THICK,
    ]);

    cloudUniformValues(look([1, -0.01, 0]), v);
    expect(v[4]).toBeCloseTo(-1 / 0.15);
  });

  it('bind as the three vec4s and no texture', () => {
    const setFloat4 = vi.fn();
    const setTexture = vi.fn();
    const effect = { setFloat4, setTexture } as unknown as Effect;
    const v = Array.from({ length: 12 }, (_, i) => i);

    bindCloudValues(effect, v);

    const written = new Map(
      setFloat4.mock.calls.map(([name, ...xyzw]) => [name, xyzw])
    );

    expect(setTexture).not.toHaveBeenCalled();
    expect(written).toEqual(
      new Map([
        ['muCloudA', [0, 1, 2, 3]],
        ['muCloudB', [4, 5, 6, 7]],
        ['muCloudC', [8, 9, 10, 11]],
      ])
    );
  });
});
