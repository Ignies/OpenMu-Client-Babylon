import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { dropName } = await import('./net');

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
