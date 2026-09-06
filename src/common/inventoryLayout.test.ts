import { describe, expect, it } from 'vitest';
import { planLayout, type Square } from './inventoryLayout';
import type { Item } from '../ecs/world';

const item = (group: number, num: number): Item => ({ group, num });

const square = (slot: number, w: number, h: number, group = 0, num = 0): Square => ({
  slot,
  item: item(group, num),
  w,
  h,
});

/** A 8x8 grid whose local indices start at 12, like the inventory's. */
const COLUMNS = 8;
const ROWS = 8;
const FIRST = 12;

describe('inventory auto-arrange', () => {
  it('packs scattered items into the top-left', () => {
    const targets = planLayout(
      [square(FIRST + 40, 1, 1), square(FIRST + 63, 1, 1), square(FIRST + 17, 1, 1)],
      COLUMNS,
      ROWS,
      FIRST
    );

    expect([...targets.values()].sort((a, b) => a - b)).toEqual([
      FIRST,
      FIRST + 1,
      FIRST + 2,
    ]);
  });

  it('gives every item a square of its own', () => {
    const squares = [
      square(FIRST + 5, 2, 3),
      square(FIRST + 20, 2, 2),
      square(FIRST + 33, 1, 1),
      square(FIRST + 44, 2, 3),
    ];

    const targets = planLayout(squares, COLUMNS, ROWS, FIRST);
    const used = new Set<number>();

    for (const entry of squares) {
      const target = targets.get(entry.slot)!;
      expect(target).toBeDefined();
      const column = (target - FIRST) % COLUMNS;
      const row = (target - FIRST - column) / COLUMNS;
      expect(column + entry.w).toBeLessThanOrEqual(COLUMNS);
      expect(row + entry.h).toBeLessThanOrEqual(ROWS);
      for (let y = 0; y < entry.h; y++) {
        for (let x = 0; x < entry.w; x++) {
          const cell = (row + y) * COLUMNS + column + x;
          expect(used.has(cell)).toBe(false);
          used.add(cell);
        }
      }
    }
  });

  it('leaves a grid that is already packed alone', () => {
    const squares = [square(FIRST, 1, 1), square(FIRST + 1, 1, 1)];
    const targets = planLayout(squares, COLUMNS, ROWS, FIRST);

    for (const entry of squares) {
      expect(targets.get(entry.slot)).toBe(entry.slot);
    }
  });
});
