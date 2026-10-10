import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Item } from '@/ecs/world';
import type { HeroStats } from '@/controllers/item_rules';
import { loadItemOptionTables, loadItemSetTables } from '@/controllers/assets';
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

// The pets' own lines (ZzzInventory.cpp:3060-3135, :4196-4207, :4306-4311).
describe('a pet tooltip', () => {
  const pet = (num: number) => lines({ group: 13, num, durability: 255 }).slice(1);

  it('names what the Demon and the Spirit of Guardian give', () => {
    expect(pet(64).slice(0, 2)).toMatchObject([
      { text: 'Increases Attack Power and Wizardry by 40%', color: 'blue' },
      { text: 'Increases Attack Speed by 10', color: 'purple' },
    ]);
    expect(pet(65).slice(0, 2)).toMatchObject([
      { text: "Alleviates monster's damage by 30%", color: 'blue' },
      { text: 'Increases Maximum Life by 50', color: 'purple' },
    ]);
  });

  it('names the zen pets', () => {
    expect(pet(67)[0]).toMatchObject({ text: 'Surrounding Zens are automatically collected.', color: 'blue' });
    expect(pet(123).slice(0, 4).map(l => l.text)).toEqual([
      'Surrounding Zens are automatically collected.',
      'increases Damage, Wizardry and Curse by 20%',
      'Increases Attack Speed by 10',
      'and EXP by 30%.',
    ]);
    expect(pet(80).slice(0, 3).map(l => l.text)).toEqual(['Auto-collects zen around you.', 'EXP rate 50% increase', 'Increase Defensive Skill +50']);
    expect(pet(106).slice(0, 3).map(l => l.text)).toEqual(['Auto-collects zen around you.', 'Zen increase 50%', 'Increase Defensive Skill +50']);
  });

  it('names the Guardian Angel, the Imp and the Horn of Dinorant in white', () => {
    expect(pet(0).slice(0, 2)).toMatchObject([
      { text: 'Absorb Damage +20%', color: 'white' },
      { text: 'Max HP +50 increased', color: 'white' },
    ]);
    expect(pet(1)[0]).toMatchObject({ text: 'Increase 30% of attacking & Wizardry Dmg', color: 'white' });
    expect(pet(3).slice(0, 2).map(l => l.text)).toEqual(['Increase Damage +15%', 'Absorb Damage +10%']);
  });
});

const HARMONY = 'Data/Local/Eng/JewelOfHarmonyOption_eng.bmd';
const SOCKETS = 'Data/Local/Eng/socketitem_eng.bmd';
const ADD_OPTIONS = 'Data/Local/ItemAddOption.bmd';
const NO_OPTIONS = !existsSync(HARMONY) || !existsSync(SOCKETS) || !existsSync(ADD_OPTIONS);
const raw = (bytes: Partial<Record<number, number>>) => Array.from({ length: 12 }, (_, i) => bytes[i] ?? (i >= 7 ? 0xff : 0));

describe.skipIf(NO_OPTIONS)('the extra options in the tooltip', () => {
  loadItemOptionTables(new Uint8Array(readFileSync(HARMONY)), new Uint8Array(readFileSync(SOCKETS)), new Uint8Array(readFileSync(ADD_OPTIONS)));

  // ZzzInventory.cpp:5008-5025, ItemAddOption.bmd through GetItemAddOtioninfoText.
  it('lists a 380 item option from ItemAddOption.bmd', () => {
    const text = lines({ group: 0, num: 22, durability: 50, raw: raw({ 0: 22, 5: 0x08 }) });
    expect(text.filter(l => l.color === 'redPurple')).toMatchObject([
      { text: 'Additional Damage +200', bold: true },
      { text: 'Attack success rate increase +10', bold: true },
    ]);
    expect(lines({ group: 0, num: 22, durability: 50 }).some(l => l.color === 'redPurple')).toBe(false);
  });

  // ZzzInventory.cpp:5037-5062, JewelOfHarmonyOption_eng.bmd.
  it('names the Jewel of Harmony option, lit once the item reaches its level', () => {
    const kris = (lvl: number) => lines({ group: 0, num: 0, lvl, durability: 20, socketBonus: (1 << 4) | 5 });
    expect(kris(9).find(l => l.text === 'Min. attack increase +7')).toMatchObject({ color: 'yellow', bold: true });
    expect(kris(3).find(l => l.text === 'Min. attack increase +7')?.color).toBe('gray');
    const armor = lines({ group: 8, num: 5, lvl: 13, durability: 30, socketBonus: (7 << 4) | 13 });
    expect(armor.some(l => l.text === 'Damage decrement increase +7%')).toBe(true);
  });

  // AttachToolTipForSocketItem (SocketSystem.cpp:218-266); level = byte / 50 + 1 (NewUIItemMng.cpp:182).
  it('lists the sockets and the socket bonus', () => {
    const text = lines({ group: 0, num: 26, durability: 50, sockets: [50 + 3, 0xfe], socketCount: 2, socketBonus: 1 });
    const header = text.findIndex(l => l.text === 'Socket Item option info');
    expect(text[header].color).toBe('purple');
    expect(text[header + 1]).toMatchObject({ text: 'Socket 1: Fire(Minimum attack/Wizardry increase +22)', color: 'blue' });
    expect(text[header + 2]).toMatchObject({ text: 'Socket 2: No item application', color: 'gray' });
    expect(text[header + 3]).toMatchObject({ text: 'Bonus socket option', color: 'purple' });
    expect(text[header + 4]).toMatchObject({ text: 'Skill attack increase +11', color: 'blue' });
  });

  it('works the level-type socket option off the hero level', () => {
    const text = lines({ group: 0, num: 26, durability: 50, sockets: [0], socketCount: 1 });
    expect(text.some(l => l.text === 'Socket 1: Fire((Level type)Attack/Wizardry increase +20)')).toBe(true);
  });
});

// CalcWingOptions (ZzzInfomation.cpp:855-940) and the wing option kinds (:1236-1442).
describe('a wing tooltip', () => {
  it('lists its wing options before skill and luck, and is never excellent', () => {
    const text = lines({ group: 12, num: 3, lvl: 9, durability: 200, luck: true, optionLevel: 2, wingOptions: 0x01 | 0x02, wingOptionKind: 2 });
    expect(text[0].text).toBe('Wings of Spirit +9');
    const at = (s: string) => text.findIndex(l => l.text === s);
    expect(at('HP +95 increased')).toBeGreaterThan(0);
    expect(at('Mana +95 increased')).toBe(at('HP +95 increased') + 1);
    expect(at('Luck (success rate of Jewel of Soul +25%)')).toBeGreaterThan(at('Mana +95 increased'));
    expect(text.some(l => l.text === 'Automatic HP recovery 2%')).toBe(true);
  });

  it('names the additional option by its kind', () => {
    const storm = (kind: number) => lines({ group: 12, num: 36, durability: 200, optionLevel: 2, wingOptionKind: kind }).map(l => l.text);
    expect(storm(0)).toContain('Automatic HP recovery 2%');
    expect(storm(2)).toContain('Additional Defense +8');
    expect(storm(3)).toContain('Additional Damage +8');
    expect(lines({ group: 12, num: 1, durability: 200, optionLevel: 1 }).map(l => l.text)).toContain('Additional Wizardry +4');
    expect(lines({ group: 12, num: 43, durability: 200, optionLevel: 1, wingOptionKind: 2 }).map(l => l.text)).toContain('Additional Curse +4');
  });

  it('lists the third wing options', () => {
    const text = lines({ group: 12, num: 37, durability: 200, wingOptions: 0x02 | 0x08 }).map(l => l.text);
    expect(text).toContain("Returns the enemy's attack power in 5%");
    expect(text).toContain('Complete recovery of Mana in 5% rate');
  });
});

// The Horn of Fenrir: its name and lines by variant (ZzzInventory.cpp:2526-2539, :5160-5222).
describe('the Horn of Fenrir tooltip', () => {
  const fenrir = (flags: number) => lines({ group: 13, num: 37, durability: 255, excellentFlags: flags });

  it('is named for its variant in blue', () => {
    expect(fenrir(0x01)[0]).toMatchObject({ text: 'Horn of Fenrir +Destroy', color: 'blue' });
    expect(fenrir(0x02)[0].text).toBe('Horn of Fenrir +Protect');
    expect(fenrir(0x04)[0].text).toBe('Horn of Fenrir +Illusion');
    expect(fenrir(0)[0].text).toBe('Horn of Fenrir');
  });

  it('lists the skill, the variant lines and the summon line', () => {
    const black = fenrir(0x01).map(l => l.text);
    expect(black).toEqual(expect.arrayContaining(['Plasma storm skill (Mana:50)', 'Increase final damage 10%', 'Increase speed', 'Can summon the Fenrir when equipped.']));
    expect(fenrir(0x02).map(l => l.text)).toContain('Absorb final damage 10%');
    const gold = fenrir(0x04);
    expect(gold.map(l => l.text)).toEqual(expect.arrayContaining(['Added 200 of Life', 'Added 200 of Mana', 'Added 33 Attack', 'Added 16 Wizardry']));
    expect(gold.find(l => l.text === 'Golden Fenrir')?.color).toBe('green');
    expect(fenrir(0).map(l => l.text)).toContain('Skills will improve through upgrading.');
  });
});

// The stack lines of the durability section (ZzzInventory.cpp:4556-4584).
describe('a stack count', () => {
  it('shows on the SD and complex potions', () => {
    for (let num = 35; num <= 40; num++) {
      expect(lines({ group: 14, num, durability: 3 }).map(l => l.text)).toContain('Number of items: 3');
    }
  });

  it('counts the Fenrir materials against what a mix takes', () => {
    expect(lines({ group: 13, num: 32, durability: 7 }).map(l => l.text)).toContain('7 / 20');
    expect(lines({ group: 13, num: 33, durability: 7 }).map(l => l.text)).toContain('7 / 20');
    const claw = lines({ group: 13, num: 34, durability: 4 }).map(l => l.text);
    expect(claw).toContain('4 / 10');
    expect(claw.some(l => l.startsWith('Durability'))).toBe(false);
  });
});
