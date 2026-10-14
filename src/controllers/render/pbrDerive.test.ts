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

  // B is where metal *could* be; only gear meshes turn it into metal (`muSurface.x`), so roughness ignores it.
  it.each([
    ['steel', [170, 170, 175], true],
    ['gold', [200, 160, 60], true],
    ['tan wood', [190, 150, 100], false],
    ['dark wood', [110, 70, 40], false],
    ['red cloth', [180, 40, 40], false],
    ['dark iron', [40, 40, 40], false],
  ])('marks %s as a metal candidate: %s', (_, colour, metal) => {
    const rgba = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < 16; i++) rgba.set([...(colour as number[]), 255], i * 4);

    const maps = derivePbrMaps(rgba, 4, 4);

    if (metal) expect(maps.metallicRoughness[2]).toBeGreaterThan(200);
    else expect(maps.metallicRoughness[2]).toBe(0);
  });

  // R is painted plate: on gear any texel that is not a dark gap or strap may be metal of its own colour.
  it.each([
    ['red plate', [180, 30, 30], true],
    ['steel', [170, 170, 175], true],
    ['dark strap', [40, 25, 15], false],
  ])('marks %s as plate: %s', (_, colour, plate) => {
    const rgba = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < 16; i++) rgba.set([...(colour as number[]), 255], i * 4);

    const maps = derivePbrMaps(rgba, 4, 4);

    if (plate) expect(maps.metallicRoughness[0]).toBeGreaterThan(200);
    else expect(maps.metallicRoughness[0]).toBe(0);
  });

  it('keeps roughness off the metal candidate', () => {
    const rgba = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < 16; i++) rgba.set([170, 170, 175, 255], i * 4);

    // 0.9 - 0.3 x smoothstep(0.5, 0.9, luma 0.669): the formula with no metal in it.
    expect(derivePbrMaps(rgba, 4, 4).metallicRoughness[1]).toBe(200);
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
