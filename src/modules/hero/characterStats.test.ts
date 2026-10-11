import { describe, expect, it } from 'vitest';
import type { Item } from '@/ecs/world';
import { CharacterClassNumber } from '@/core/types';
import { deriveCharacterStats } from './characterStats';

const PET_SLOT = 8;
const stats = (pet: Item | null, charClass = CharacterClassNumber.DarkKnight) => {
  const items: (Item | null)[] = new Array(12).fill(null);
  items[PET_SLOT] = pet;
  return deriveCharacterStats({ charClass, level: 240, strength: 600, agility: 300, vitality: 100, energy: 450, leadership: 0, items });
};
const helper = (num: number, more: Partial<Item> = {}): Item => ({ group: 13, num, durability: 255, ...more });

// NewUICharacterInfoWindow.cpp:707-737 (damage), :954-959 (defense), :1296-1326 (wizardry), :1424-1442 (curse).
describe('the character window with a pet', () => {
  const bare = stats(null);
  const bareSummoner = stats(null, CharacterClassNumber.Summoner);

  it('adds the Demon 40%, the Skeleton 20% and the Imp 30% to damage and wizardry', () => {
    for (const [num, rate] of [[64, 0.4], [123, 0.2], [1, 0.3]]) {
      const with_ = stats(helper(num));
      expect(with_.damageMin).toBe(bare.damageMin + Math.trunc(bare.damageMin * rate));
      expect(with_.damageMax).toBe(bare.damageMax + Math.trunc(bare.damageMax * rate));
      expect(with_.wizardryMax).toBe(bare.wizardryMax + Math.trunc(bare.wizardryMax * rate));
    }
  });

  it('adds the Demon and the Skeleton, not the Imp, to curse', () => {
    expect(stats(helper(64), CharacterClassNumber.Summoner).curseMax).toBe(bareSummoner.curseMax + Math.trunc(bareSummoner.curseMax * 0.4));
    expect(stats(helper(1), CharacterClassNumber.Summoner).curseMax).toBe(bareSummoner.curseMax);
  });

  it('adds level / 12 damage and level / 25 wizardry for the gold Fenrir only', () => {
    const gold = stats(helper(37, { excellentFlags: 0x04 }));
    expect(gold.damageMin).toBe(bare.damageMin + 20);
    expect(gold.wizardryMin).toBe(bare.wizardryMin + 9);
    expect(stats(helper(37, { excellentFlags: 0x01 })).damageMin).toBe(bare.damageMin);
  });

  it('adds 50 defense for the Panda and the Unicorn', () => {
    expect(stats(helper(80)).defense).toBe(bare.defense + 50);
    expect(stats(helper(106)).defense).toBe(bare.defense + 50);
  });
});

// NewUICharacterInfoWindow.cpp:680-704 (damage), :1259-1294 (wizardry), :1395-1418 (curse).
describe('the character window with a transformation ring', () => {
  const withRings = (rings: (Item | null)[], charClass = CharacterClassNumber.DarkKnight, pet: Item | null = null) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    items[PET_SLOT] = pet;
    [items[10], items[11]] = rings;
    return deriveCharacterStats({ charClass, level: 240, strength: 600, agility: 300, vitality: 100, energy: 450, leadership: 0, items });
  };
  const bare = stats(null);
  const bareSummoner = stats(null, CharacterClassNumber.Summoner);

  it('adds the best of the Christmas 20, Panda 30 and Skeleton 40 rings to damage and wizardry', () => {
    expect(withRings([helper(41), null]).damageMin).toBe(bare.damageMin + 20);
    expect(withRings([null, helper(76)]).wizardryMax).toBe(bare.wizardryMax + 30);
    expect(withRings([helper(76), helper(122)]).damageMax).toBe(bare.damageMax + 40);
  });

  it('adds only the Panda and Skeleton rings to curse', () => {
    expect(withRings([helper(41), null], CharacterClassNumber.Summoner).curseMin).toBe(bareSummoner.curseMin);
    expect(withRings([helper(122), null], CharacterClassNumber.Summoner).curseMin).toBe(bareSummoner.curseMin + 40);
  });

  it('adds the ring before the pet multiplies', () => {
    expect(withRings([helper(76), null], CharacterClassNumber.DarkKnight, helper(64)).damageMin).toBe(Math.trunc((bare.damageMin + 30) * 1.4));
  });
});
