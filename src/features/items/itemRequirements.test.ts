import { describe, expect, it } from 'vitest';
import { itemStats } from './itemStats';

const DRAGON_ARMOR = { group: 8, num: 1 };
const WINGS_OF_ELF = { group: 12, num: 0 };

const stats = (item: Parameters<typeof itemStats>[0]) => {
  const s = itemStats(item);
  if (!s) throw new Error(`no item ${item.group}:${item.num}`);
  return s;
};

describe('item requirements as OpenMU checks them', () => {
  it('asks four more strength per level of the item option', () => {
    const plain = stats({ ...DRAGON_ARMOR, lvl: 7 });
    for (const optionLevel of [1, 2, 3, 4, 7]) {
      expect(stats({ ...DRAGON_ARMOR, lvl: 7, optionLevel }).reqStr).toBe(
        plain.reqStr + optionLevel * 4
      );
    }
  });

  it('adds no strength to an item that needs none', () => {
    expect(stats({ ...WINGS_OF_ELF, optionLevel: 3 }).reqStr).toBe(0);
  });

  it('keeps a wing at its own level however far it is upgraded', () => {
    const WINGS_OF_SPIRITS = { group: 12, num: 3 };
    for (const lvl of [0, 5, 9, 13, 15]) {
      expect(stats({ ...WINGS_OF_ELF, lvl }).reqLvl).toBe(180);
      expect(stats({ ...WINGS_OF_SPIRITS, lvl }).reqLvl).toBe(215);
    }
  });

  it('asks the level OpenMU asks of pets and third wings', () => {
    const HORN_OF_UNICORN = { group: 13, num: 2 };
    const WING_OF_STORM = { group: 12, num: 36 };
    expect(stats(HORN_OF_UNICORN).reqLvl).toBe(25);
    expect(stats(WING_OF_STORM).reqLvl).toBe(400);
  });

  it('leaves the other stats alone', () => {
    const plain = stats({ ...DRAGON_ARMOR, lvl: 7 });
    const optioned = stats({ ...DRAGON_ARMOR, lvl: 7, optionLevel: 4 });
    expect(optioned.reqAgi).toBe(plain.reqAgi);
    expect(optioned.reqLvl).toBe(plain.reqLvl);
  });
});
