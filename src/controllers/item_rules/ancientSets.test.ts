import { describe, expect, it } from 'vitest';
import type { ItemSet, ItemSetTables } from '../assets/mu';
import { activeSetOptions, ancientSetOf, setOptionLines, wornSetPieces, wornStatBonus } from './ancientSets';
import { itemStats, type HeroStats } from './itemStats';

const none = { option: 0xff, value: 0xff };
const opt = (option: number, value: number) => ({ option, value });
// Three pieces: two standard rows, one full option.
const SET: ItemSet = {
  name: 'Test',
  standard: [[opt(0, 10), none], [opt(19, 20), none], [none, none], [none, none], [none, none], [none, none]],
  ext: [none, none],
  full: [opt(15, 5), none, none, none, none],
  itemCount: 3,
};
const setOf = new Uint8Array(8192 * 2).fill(0xff);
// Leather helm / armor / pants (7, 8, 9 / 5) in set 1 through discriminator 1.
for (const group of [7, 8, 9]) setOf[(group * 512 + 5) * 2] = 1;
const TABLES: ItemSetTables = { setOf, sets: [null, SET] };
const HERO: HeroStats = { level: 400, str: 1000, agi: 1000, vit: 1000, ene: 1000, cmd: 0, baseClass: 1, stepClass: 2 };
const piece = (group: number) => ({ group, num: 5, ancientDiscriminator: 1, durability: 30 });

// calcSetOptionList (CSItemOption.cpp:316-372).
describe('ancient set options', () => {
  it('lights one standard option per piece past the first, the full ones with the whole set', () => {
    expect(setOptionLines(SET, 1)).toEqual([]);
    expect(setOptionLines(SET, 2).map(l => l.active)).toEqual([true, false, false]);
    expect(setOptionLines(SET, 3).map(l => l.active)).toEqual([true, true, true]);
    expect(setOptionLines(SET, 3).map(l => l.kind)).toEqual(['standard', 'standard', 'full']);
  });

  it('finds the set by the discriminator', () => {
    expect(ancientSetOf(piece(8), TABLES)).toBe(SET);
    expect(ancientSetOf({ ...piece(8), ancientDiscriminator: 2 }, TABLES)).toBeNull();
    expect(ancientSetOf({ ...piece(8), ancientDiscriminator: 0 }, TABLES)).toBeNull();
  });

  it('counts the worn pieces with durability left (CheckItemSetOptions)', () => {
    expect(wornSetPieces(SET, [null, null, piece(7), piece(8), piece(9)], HERO, TABLES)).toBe(3);
    expect(wornSetPieces(SET, [null, null, piece(7), { ...piece(8), durability: 0 }], HERO, TABLES)).toBe(1);
  });
});

// getAllAddState (CSItemOption.cpp:666-698): each worn piece's AncientBonusOption * 5 on its AttType, then
// AddStatsBySetOptions (:701-740) on the sets CheckItemSetOptions' first pass counts by durability alone (:796-834).
describe('the stats worn items add', () => {
  const NO_STATS = { str: 0, agi: 0, ene: 0, vit: 0, cmd: 0 };

  it("adds each piece's ancient bonus and the set's stat options, counted without requirements", () => {
    expect(wornStatBonus([null, null, piece(7), piece(8)], TABLES)).toEqual({ ...NO_STATS, str: 10 });
    // Leather is AttType 4: vitality.
    expect(wornStatBonus([null, null, { ...piece(7), ancientBonusLevel: 2 }], TABLES)).toEqual({ ...NO_STATS, vit: 10 });
    expect(wornStatBonus([null, null, { ...piece(7), ancientBonusLevel: 2, durability: 0 }], TABLES)).toEqual(NO_STATS);
  });

  it("meets the set pieces' requirements with those stats (CheckItemSetOptions :836-861)", () => {
    const worn = [null, null, piece(7), piece(8), piece(9)];
    const need = Math.max(...worn.map(p => (p ? itemStats(p)?.reqStr ?? 0 : 0)));
    expect(activeSetOptions(worn, { ...HERO, str: need - 10 }, TABLES)).toHaveLength(3);
    expect(activeSetOptions(worn, { ...HERO, str: need - 11 }, TABLES)).not.toHaveLength(3);
  });
});
