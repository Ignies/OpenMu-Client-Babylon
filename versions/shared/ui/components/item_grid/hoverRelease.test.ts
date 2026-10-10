import { describe, expect, it } from 'vitest';
import { pointerInside } from './hoverRelease';

const grid = { contains: (node: unknown) => node === cell };
const cell = { closest: () => null };
const slot = { closest: (selector: string) => (selector === '.equipment-slot' ? slot : null) };
const elsewhere = { closest: () => null };

// A tooltip never outlives the pointer: a move outside the grid drops the hover.
describe('pointerInside', () => {
  it('keeps the hover over the grid or a square the selector names', () => {
    expect(pointerInside(cell, grid)).toBe(true);
    expect(pointerInside(slot, grid, '.equipment-slot')).toBe(true);
  });

  it('drops it anywhere else, or with no grid or target', () => {
    expect(pointerInside(elsewhere, grid, '.equipment-slot')).toBe(false);
    expect(pointerInside(cell, null)).toBe(false);
    expect(pointerInside(null, grid)).toBe(false);
  });
});
