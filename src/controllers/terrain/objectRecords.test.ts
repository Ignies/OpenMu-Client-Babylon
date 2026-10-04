import { describe, expect, it } from 'vitest';
import { placesObject } from './objectRecords';

const at = (id: number, x: number, y: number) => ({ id, pos: { x, y, z: 0 } });

describe('placesObject', () => {
  it('keeps a record inside the 16x16 block grid', () => {
    expect(placesObject(at(12, 100, 25599))).toBe(true);
  });

  it('drops a record outside the grid, as CreateObject does', () => {
    expect(placesObject(at(12, -1, 100))).toBe(false);
    expect(placesObject(at(12, 100, 25600))).toBe(false);
  });

  it('drops a record with NaN coordinates (two Devias gate records)', () => {
    expect(placesObject(at(12, NaN, 100))).toBe(false);
  });

  it('drops a negative type, which has no model to draw (World7 places one at -515)', () => {
    expect(placesObject(at(-515, 100, 100))).toBe(false);
  });
});
