import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Item } from '@/ecs/world';
import type { HeroStats } from '@/controllers/item_rules';
import { loadItemSetTables } from '@/controllers/assets';
import { buildItemTooltip, itemNameColor } from './itemTooltip';

// RenderItemInfo name colour (ZzzInventory.cpp:2104-2160).
describe('the tooltip name colour', () => {
  it('is green for any excellent item, with or without an option or a high level', () => {
    expect(itemNameColor({ group: 0, num: 0, isExcellent: true, excellentFlags: 1 })).toBe('green');
    expect(itemNameColor({ group: 0, num: 0, lvl: 9, isExcellent: true, excellentFlags: 1 })).toBe('green');
  });
});

const KNIGHT: HeroStats = { level: 400, str: 1000, agi: 1000, vit: 1000, ene: 1000, cmd: 0, baseClass: 1, stepClass: 2 };
const lines = (item: Item, ancient?: Parameters<typeof buildItemTooltip>[3]) =>
  (buildItemTooltip(item, KNIGHT, null, ancient)?.lines ?? []).filter(l => !l.blank);

const TYPES = 'Data/Local/itemsettype.bmd';
const OPTIONS = 'Data/Local/Eng/itemsetoption_eng.bmd';
// Data/ is not checked out everywhere (CI without assets).
const NO_DATA = !existsSync(TYPES) || !existsSync(OPTIONS);

// Warrior's set (ItemSetOption_eng.bmd set 1): Leather Helm / Armor / Pants ... with discriminator 1.
const warrior = (group: number, more: Partial<Item> = {}): Item => ({ group, num: 5, ancientDiscriminator: 1, isAncient: true, durability: 30, ...more });

describe.skipIf(NO_DATA)('an ancient item', () => {
  loadItemSetTables(new Uint8Array(readFileSync(TYPES)), new Uint8Array(readFileSync(OPTIONS)));

  it('carries its set name in front of its own (GetSetItemName)', () => {
    expect(lines(warrior(8))[0].text).toBe("Warrior's Leather Armor");
  });

  it('shows its +5 bonus as the stat it raises (GetDefaultOptionText)', () => {
    const bonus = lines(warrior(8, { ancientBonusLevel: 1 })).find(l => l.text === 'Increase stamina +5');
    expect(bonus?.color).toBe('blue');
  });

  it('lists the set options lit for the pieces worn (RenderSetOptionListInItem)', () => {
    const worn = [null, null, warrior(7), warrior(8)];
    const text = lines(warrior(8), { worn, equipped: true });
    const header = text.findIndex(l => l.text === 'Set Item option info');
    expect(text[header].color).toBe('yellow');
    expect(text[header + 1]).toMatchObject({ text: 'Increase strength +10', color: 'blue' });
    expect(text[header + 2]).toMatchObject({ text: 'Increase skill attacking rate +10', color: 'gray' });
    expect(text.at(-1)).toMatchObject({ text: 'Increase strength +25', color: 'gray' });
  });

  it('greys every option of an item in the bag', () => {
    const worn = [null, null, warrior(7), warrior(8)];
    const text = lines(warrior(8), { worn, equipped: false });
    const header = text.findIndex(l => l.text === 'Set Item option info');
    expect(text[header + 1]).toMatchObject({ text: 'Increase strength +10', color: 'gray' });
  });

  it('keeps only the header while fewer than two pieces are worn', () => {
    const text = lines(warrior(8), { worn: [], equipped: false });
    expect(text.at(-1)?.text).toBe('Set Item option info');
  });
});
