import { describe, expect, it } from 'vitest';
import { fadeSheetEdges, fadeSheetSides } from './softEdge';

/** A `size` x `size` sheet, opaque everywhere, as smoke02 is up to its border. */
function opaqueSheet(size: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(size * size * 4);
  for (let i = 3; i < px.length; i += 4) px[i] = 255;
  return px;
}

const alphaAt = (px: Uint8ClampedArray, width: number, x: number, y: number) => px[(y * width + x) * 4 + 3];

describe('fadeSheetEdges', () => {
  it('leaves nothing on the border of the card and keeps its middle', () => {
    const size = 64;
    const px = opaqueSheet(size);
    fadeSheetEdges(px, size, size);

    for (let i = 0; i < size; i++) {
      for (const [x, y] of [[i, 0], [i, size - 1], [0, i], [size - 1, i]]) {
        expect(alphaAt(px, size, x, y)).toBeLessThan(16);
      }
    }
    expect(alphaAt(px, size, size / 2, size / 2)).toBe(255);
  });

  it('fades each cell of a sheet on its own', () => {
    const px = opaqueSheet(64);
    fadeSheetEdges(px, 64, 64, 32, 32);
    // The seam between two cells is a border for both, the middle of a cell is not.
    expect(alphaAt(px, 64, 31, 16)).toBeLessThan(16);
    expect(alphaAt(px, 64, 16, 16)).toBe(255);
  });

  it('only touches alpha', () => {
    const px = opaqueSheet(8);
    px.fill(200, 0, 3);
    fadeSheetEdges(px, 8, 8);
    expect([px[0], px[1], px[2]]).toEqual([200, 200, 200]);
  });
});

describe('fadeSheetSides', () => {
  it('fades a ribbon sheet at its two sides and leaves its length alone', () => {
    const [w, h] = [256, 32];
    const px = new Uint8ClampedArray(w * h * 4);
    for (let i = 3; i < px.length; i += 4) px[i] = 255;
    fadeSheetSides(px, w, h);

    for (const x of [0, 128, 255]) {
      expect(alphaAt(px, w, x, 0)).toBeLessThan(16);
      expect(alphaAt(px, w, x, h - 1)).toBeLessThan(16);
      expect(alphaAt(px, w, x, h / 2)).toBe(255);
    }
  });
});
