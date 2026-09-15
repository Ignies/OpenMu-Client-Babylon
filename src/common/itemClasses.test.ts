import { describe, expect, it } from 'vitest';
import {
  CLASS_COLUMNS,
  classCanUse,
  classUnrestricted,
  classOf,
  itemDef,
  type HeroStats,
} from './itemStats';
import items from './items.json';

const hero = (charClass: number, over: Partial<HeroStats> = {}): HeroStats => {
  const { base, step } = classOf(charClass);
  return {
    level: 400, str: 999, agi: 999, vit: 999, ene: 999, cmd: 999,
    baseClass: base,
    stepClass: step,
    ...over,
  };
};

// Wire class numbers.
const DARK_WIZARD = 0;
const DARK_KNIGHT = 4;
const RAGE_FIGHTER = 24;
const FIST_MASTER = 25;

const def = (group: number, index: number) => {
  const d = itemDef(group, index);
  if (!d) throw new Error(`no item ${group}:${index}`);
  return d;
};

describe('the Rage Fighter class column', () => {
  it('is the seventh, after the six the Item.txt named', () => {
    expect(CLASS_COLUMNS[6]).toBe('RF');
    expect(CLASS_COLUMNS).toHaveLength(7);
  });

  it('gives every row that carries a class block a value', () => {
    const withBlock = items.filter(row => 'SUM' in row);
    expect(withBlock.length).toBeGreaterThan(500);
    expect(withBlock.every(row => 'RF' in row)).toBe(true);
  });

  it('places the Rage Fighter and the Fist Master on their own column', () => {
    expect(classOf(RAGE_FIGHTER)).toEqual({ base: 6, step: 1 });
    // No second class: the Fist Master is the master step.
    expect(classOf(FIST_MASTER)).toEqual({ base: 6, step: 3 });
  });

  it('lets him use the gear the server says he can', () => {
    const rf = hero(RAGE_FIGHTER);
    // Kris and the Leather set are his; the Rune Blade is the MG's.
    expect(classCanUse(def(0, 0), rf)).toBe(true); // Kris
    expect(classCanUse(def(0, 35), rf)).toBe(true); // Phoenix Soul Star
    expect(classCanUse(def(8, 5), rf)).toBe(true); // Leather Armor
    expect(classCanUse(def(0, 31), rf)).toBe(false); // Rune Blade
    expect(classCanUse(def(5, 0), rf)).toBe(false); // Skull Staff
  });

  it('wears a whole armour set, gloves included', () => {
    const rf = hero(RAGE_FIGHTER);
    // Leather, Scale, Brass and Plate: the four sets that are his. The server
    // has no Rage Fighter parameter on `CreateGloves` at all, so group 10 came
    // back 0 and each set read as four pieces out of five (#204).
    for (const set of [5, 6, 8, 9]) {
      for (const group of [7, 8, 9, 10, 11]) {
        expect(classCanUse(def(group, set), rf)).toBe(true);
      }
    }
  });

  it('does not hand him a glove whose own set is not his', () => {
    // Sphinx: nobody in that set is his, so the gloves are not either.
    expect(classCanUse(def(10, 7), hero(RAGE_FIGHTER))).toBe(false);
  });

  it('keeps the glove weapons off every other class', () => {
    for (const cls of [DARK_WIZARD, DARK_KNIGHT]) {
      expect(classCanUse(def(0, 35), hero(cls))).toBe(false);
    }
  });

  it('answers for him at all, where it used to refuse everything', () => {
    // The old table had no column, so `classOf` returned base -1 and
    // `classCanUse` was false for anything not open to all six classes.
    expect(hero(RAGE_FIGHTER).baseClass).toBeGreaterThanOrEqual(0);
  });
});

describe('unrestricted items', () => {
  it('reads off the six inherited columns, not the seventh', () => {
    // A jewel is open to everyone and names no class; adding a seventh column
    // must not turn it into a six-class list with the Rage Fighter missing.
    const jewels = items.filter(
      row =>
        'RF' in row &&
        CLASS_COLUMNS.slice(0, 6).every(c => (row as Record<string, unknown>)[c] === 1)
    );
    expect(jewels.length).toBeGreaterThan(0);
    for (const row of jewels) {
      const d = itemDef(row.Group, row.Index);
      if (!d) continue;
      expect(classUnrestricted(d)).toBe(true);
      expect(classCanUse(d, hero(RAGE_FIGHTER))).toBe(true);
      expect(classCanUse(d, hero(DARK_WIZARD))).toBe(true);
    }
  });

  it('still treats a class-gated item as gated', () => {
    expect(classUnrestricted(def(0, 31))).toBe(false); // Rune Blade, MG only
  });
});
