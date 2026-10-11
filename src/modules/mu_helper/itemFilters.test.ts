import { describe, expect, it } from 'vitest';
import { decodeMuHelperConfig, defaultMuHelperConfig, encodeMuHelperConfig, MAX_EXTRA_ITEM_CHARS } from './config';
import { matchesFilteredItem, restoreExtraItems } from './itemFilters';

// The player's `helperItemFilters` (ours): `+` words in an extra item are filters.
describe('extra item filters', () => {
  const shield = { lvl: 9, luck: true, hasSkill: false, optionLevel: 3 };
  const match = (entry: string, item: object = shield, name = 'Guardian Shield') =>
    matchesFilteredItem([entry], name, item);

  it('matches the name alone, as the original', () => {
    expect(match('guardian')).toBe(true);
    expect(match('Dragon')).toBe(false);
  });

  it('reads luck, skill, excellent and ancient', () => {
    expect(match('Guardian Shield +Luck')).toBe(true);
    expect(match('Guardian Shield +Luck', { ...shield, luck: false })).toBe(false);
    expect(match('Shield +Skill')).toBe(false);
    expect(match('+Exc', { isExcellent: true }, 'Sword')).toBe(true);
    expect(match('+Anc', {}, 'Sword')).toBe(false);
  });

  it('reads the additional option and the item level', () => {
    expect(match('Guardian Shield +Opt 12')).toBe(true);
    expect(match('Guardian Shield +Opt12')).toBe(true);
    expect(match('Guardian Shield +Opt 16')).toBe(false);
    expect(match('Guardian Shield +Opt', { ...shield, optionLevel: 0 })).toBe(false);
    expect(match('Shield +9')).toBe(true);
    expect(match('Shield +10')).toBe(false);
  });

  it('puts the whole text back over the cut blob slots, each entry once', () => {
    const full = ['Guardian Shield +Luck +Opt 12', 'Guardian Shield +Skill', 'Jewel'];
    const config = { ...defaultMuHelperConfig(), extraItems: full };
    const slots = decodeMuHelperConfig(encodeMuHelperConfig(config)).extraItems;

    expect(slots.every(s => s.length <= MAX_EXTRA_ITEM_CHARS)).toBe(true);
    expect(restoreExtraItems(slots, full)).toEqual(full);
    expect(restoreExtraItems(['Guardian Shiel', 'Box'], [])).toEqual(['Guardian Shiel', 'Box']);
  });
});
