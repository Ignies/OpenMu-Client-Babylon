import { describe, expect, it } from 'vitest';
import {
  ITEM_CATALOGUE,
  buildMonsterCatalogue,
  buildSkinCatalogue,
  classifyRow,
  itemCommandValues,
  searchItems,
  searchSkins,
  type MonsterRow,
} from './catalogues';

const row = (over: Partial<MonsterRow>): MonsterRow =>
  ({ Numb: 0, Name: 'X', Level: 1, AttType: 3, ...over }) as MonsterRow;

describe('skin catalogue', () => {
  it('lists only what the client can draw, in number order', () => {
    const list = buildSkinCatalogue(n => n === 1 || n === 0, new Set());
    expect(list.map(e => e.number)).toEqual([0, 1]);
    expect(list[0].name).toBe('Bull Fighter');
    expect(list[1].name).toBe('Hound');
  });

  it('calls a merchant an NPC and a fighter a monster', () => {
    expect(classifyRow(row({ Numb: 251, AttType: 0 }), new Set())).toBe('npc');
    expect(classifyRow(row({ Numb: 0, AttType: 3 }), new Set())).toBe('monster');
    // Known by number even when the row says it fights.
    expect(classifyRow(row({ Numb: 226, AttType: 3 }), new Set([226]))).toBe('npc');
  });

  it('searches by name, number or the shown name, filtered by kind', () => {
    const list = buildSkinCatalogue(() => true, new Set([240, 251]));
    expect(searchSkins(list, 'hound', 'all').map(e => e.number)).toContain(1);
    expect(searchSkins(list, '251', 'all').map(e => e.number)).toEqual([251]);
    expect(searchSkins(list, 'hanzo', 'monster')).toEqual([]);
    expect(searchSkins(list, 'hanzo', 'npc').map(e => e.number)).toEqual([251]);
    expect(searchSkins(list, 'perro', 'all', e => (e.number === 1 ? 'Perro' : e.name)).map(e => e.number)).toEqual([1]);
  });

  it('spawns from the whole table, drawn or not', () => {
    const all = buildMonsterCatalogue(new Set());
    const drawn = buildSkinCatalogue(n => n < 10, new Set());
    expect(all.length).toBeGreaterThan(drawn.length);
  });
});

describe('item catalogue', () => {
  it('is the item table in group and number order', () => {
    expect(ITEM_CATALOGUE[0]).toMatchObject({ group: 0, number: 0, name: 'Kris' });
    for (let i = 1; i < ITEM_CATALOGUE.length; i++) {
      const a = ITEM_CATALOGUE[i - 1];
      const b = ITEM_CATALOGUE[i];
      expect(a.group < b.group || (a.group === b.group && a.number < b.number)).toBe(true);
    }
  });

  it('searches a group by name or number', () => {
    expect(searchItems('kris', null).map(e => e.name)).toContain('Kris');
    expect(searchItems('kris', 1)).toEqual([]);
    expect(searchItems('0', 0)[0]).toMatchObject({ group: 0, number: 0 });
  });

  it('fills every positional slot of /item', () => {
    const kris = ITEM_CATALOGUE[0];
    expect(
      itemCommandValues(kris, { level: 9, excellent: 0, skill: true, luck: true, option: 4, ancient: 0 })
    ).toEqual({ group: '0', number: '0', lvl: '9', ex: '0', sk: '1', lu: '1', opt: '4', anc: '0' });
  });
});
