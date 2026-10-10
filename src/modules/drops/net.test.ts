import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { dropName } = await import('./net');
const { loadItemSetTables } = await import('@/controllers/assets');

// BuildGroundItemLabelDescriptor (ZzzInventory.cpp:6645-6663): skill, option, luck, no number.
describe('a ground item label', () => {
  it('appends +Skill, +Option and +Luck in that order', () => {
    const kris = { group: 0, num: 0, lvl: 3, hasSkill: true, luck: true, optionLevel: 2 };
    expect(dropName(false, 0, 'Kris', kris)).toBe('Kris +3+Skill+Option+Luck');
  });

  it('marks only what the item has', () => {
    expect(dropName(false, 0, 'Kris', { group: 0, num: 0, luck: true })).toBe('Kris+Luck');
    expect(dropName(false, 0, 'Kris', { group: 0, num: 0 })).toBe('Kris');
  });

  it('names the Horn of Dinorant skill as the knight skill', () => {
    const horn = { group: 13, num: 3, hasSkill: true };
    expect(dropName(false, 0, 'Horn of Dinorant', horn)).toBe('Horn of Dinorant +Knight specific skill');
  });
});

const TYPES = 'Data/Local/itemsettype.bmd';
const OPTIONS = 'Data/Local/Eng/itemsetoption_eng.bmd';

// The set name goes in front (ZzzInventory.cpp:6632-6643).
describe.skipIf(!existsSync(TYPES) || !existsSync(OPTIONS))('an ancient ground item label', () => {
  it('starts with the set name', () => {
    loadItemSetTables(new Uint8Array(readFileSync(TYPES)), new Uint8Array(readFileSync(OPTIONS)));
    const armor = { group: 8, num: 5, lvl: 2, isAncient: true, ancientDiscriminator: 1, luck: true };
    expect(dropName(false, 0, 'Leather Armor', armor)).toBe("Warrior's Leather Armor +2+Luck");
  });
});
