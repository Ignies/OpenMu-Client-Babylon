import { describe, expect, it } from 'vitest';
import { derivePbrMaps, flipRows } from './pbrDerive';

describe('flipRows', () => {
  it('reverses the row order in place and leaves the middle row of an odd image', () => {
    const w = 2;
    const h = 3;
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < rgba.length; i++) rgba[i] = i;

    const before = Array.from(rgba);
    flipRows(rgba, w, h);

    const row = (src: number[], y: number) => src.slice(y * w * 4, (y + 1) * w * 4);
    expect(row(Array.from(rgba), 0)).toEqual(row(before, 2));
    expect(row(Array.from(rgba), 1)).toEqual(row(before, 1));
    expect(row(Array.from(rgba), 2)).toEqual(row(before, 0));
  });

  it('is its own inverse', () => {
    const rgba = new Uint8Array(4 * 4 * 4).map((_, i) => (i * 7) & 255);
    const before = Array.from(rgba);
    flipRows(rgba, 4, 4);
    flipRows(rgba, 4, 4);
    expect(Array.from(rgba)).toEqual(before);
  });
});

describe('derivePbrMaps', () => {
  it('derives a flat normal and no emissive from a uniform dark texture', () => {
    const w = 4;
    const h = 4;
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) rgba.set([40, 40, 40, 255], i * 4);

    const maps = derivePbrMaps(rgba, w, h);

    expect(maps.emissive).toBeNull();
    expect(Array.from(maps.normal.subarray(0, 4))).toEqual([127, 127, 255, 255]);
    expect(maps.metallicRoughness[2]).toBe(0);
  });

  it('flags saturated bright texels as emissive', () => {
    const w = 4;
    const h = 4;
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) rgba.set([255, 230, 40, 255], i * 4);

    const maps = derivePbrMaps(rgba, w, h);

    expect(maps.emissive).not.toBeNull();
    // Mask 0.72 at this colour: bright and saturated, but not at the top of either ramp.
    expect(maps.emissive![0]).toBeGreaterThan(150);
  });
});
