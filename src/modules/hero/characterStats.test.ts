import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Item } from '@/ecs/world';
import { CharacterClassNumber } from '@/core/types';
import { itemOptionTables, itemSetTables, loadItemOptionTables, loadItemSetTables } from '@/controllers/assets';
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

// CalculateSuccessfulBlocking reads EQUIPMENT_WEAPON_LEFT, slot 1 (ZzzInfomation.cpp:3222, _define.h:209).
describe('the character window defense rate with a shield', () => {
  const held = (slot: number) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    items[slot] = { group: 6, num: 12, durability: 52 };
    return deriveCharacterStats({ charClass: CharacterClassNumber.DarkKnight, level: 240, strength: 600, agility: 300, vitality: 100, energy: 450, leadership: 0, items }).defenseRate;
  };
  const bare = stats(null).defenseRate;

  it("adds the Bronze Shield's blocking from the left hand (slot 1), not from slot 0", () => {
    expect(held(1)).toBe(bare + 54 + 27 + 48);
    expect(held(0)).toBe(bare);
  });

  // ZzzInfomation.cpp:3223-3237, CalcDurabilityPercent (:2440-2485), the +5 blocking per option level (:1207-1211).
  const shield = (more: Partial<Item>) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    items[1] = { group: 6, num: 12, durability: 52, ...more };
    return deriveCharacterStats({ charClass: CharacterClassNumber.DarkKnight, level: 240, strength: 600, agility: 300, vitality: 100, energy: 450, leadership: 0, items }).defenseRate;
  };

  it('adds the option level and loses half of both when the shield is below 20% durability', () => {
    expect(shield({ optionLevel: 2 })).toBe(bare + 129 + 10);
    expect(shield({ optionLevel: 2, durability: 10 })).toBe(bare + 129 - 64 + 10 - 5);
    expect(shield({ optionLevel: 2, durability: 0 })).toBe(bare);
  });

  it('adds 10% for the excellent defense success rate option', () => {
    expect(shield({ isExcellent: true, excellentFlags: 0x02, durability: 67 })).toBe(Math.trunc((bare + 159) * 1.1));
  });
});

// The window takes the magic percent from pWeaponRight, EQUIPMENT_WEAPON_RIGHT slot 0 (NewUICharacterInfoWindow.cpp:509, :1336-1346).
describe('the character window wizardry with a staff', () => {
  const held = (slot: number) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    items[slot] = { group: 5, num: 17, durability: 81 };
    return deriveCharacterStats({ charClass: CharacterClassNumber.DarkWizard, level: 240, strength: 600, agility: 300, vitality: 100, energy: 450, leadership: 0, items }).staffRate;
  };

  it("takes the Ancient Staff's magic power from the right hand (slot 0), not from slot 1", () => {
    expect(held(0)).toBe(38);
    expect(held(1)).toBe(0);
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

const SET_TYPES = 'Data/Local/itemsettype.bmd';
const SET_OPTIONS = 'Data/Local/Eng/itemsetoption_eng.bmd';
const SOCKETS = 'Data/Local/Eng/socketitem_eng.bmd';
const HARMONY = 'Data/Local/Eng/JewelOfHarmonyOption_eng.bmd';
const ADD_OPTIONS = 'Data/Local/ItemAddOption.bmd';
const NO_DATA = ![SET_TYPES, SET_OPTIONS, SOCKETS, HARMONY, ADD_OPTIONS].every(existsSync);

// CalculateDamage / CalculateAttackRating / CalculateDefense (ZzzInfomation.cpp:2745-2812, :3127-3129, :3361-3380),
// CalculateMagicDamage (:3005-3035), CalculateSuccessfulBlocking (:3248), CalcSocketStatusBonus (SocketSystem.cpp:476-570).
describe.skipIf(NO_DATA)('the character window with ancient sets and sockets', () => {
  // skipIf still runs this body to collect the tests, so the reads need their own guard.
  const read = (path: string) => new Uint8Array(readFileSync(path));
  if (!NO_DATA) {
    loadItemSetTables(read(SET_TYPES), read(SET_OPTIONS));
    loadItemOptionTables(read(HARMONY), read(SOCKETS), read(ADD_OPTIONS));
  }
  const sets = itemSetTables();
  const options = itemOptionTables();
  const worn = (pieces: Record<number, Item>, charClass = CharacterClassNumber.DarkKnight) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    for (const [slot, item] of Object.entries(pieces)) items[Number(slot)] = item;
    return deriveCharacterStats({ charClass, level: 400, strength: 1000, agility: 1000, vitality: 1000, energy: 1000, leadership: 0, items, sets, options });
  };
  const piece = (group: number, num: number, ancientDiscriminator: number, more: Partial<Item> = {}): Item => ({ group, num, ancientDiscriminator, isAncient: true, durability: 60, ...more });
  const bare = worn({});

  it("adds Berserker's maximum damage, one row per piece past the first (set 6, option 6)", () => {
    const two = worn({ 2: piece(7, 6, 2), 3: piece(8, 6, 2) });
    const three = worn({ 2: piece(7, 6, 2), 3: piece(8, 6, 2), 4: piece(9, 6, 2) });
    const plain = worn({ 2: piece(7, 6, 0), 3: piece(8, 6, 0), 4: piece(9, 6, 0) });
    expect(two.damageMax - plain.damageMax).toBe(10);
    expect(three.damageMax - plain.damageMax).toBe(30);
    expect(three.damageMin).toBe(plain.damageMin);
  });

  it("adds Eplete's attack rate with three pieces (set 5, option 9) and Hyon's defense (set 11, option 10)", () => {
    const eplete = worn({ 2: piece(7, 6, 1), 3: piece(8, 6, 1), 4: piece(9, 6, 1) });
    expect(eplete.attackRate).toBe(bare.attackRate + 50);
    const hyon = worn({ 2: piece(7, 1, 1), 5: piece(10, 1, 1) });
    expect(hyon.defense - worn({ 2: piece(7, 1, 0), 5: piece(10, 1, 0) }).defense).toBe(25);
  });

  it('skips a set the hero cannot wear (CheckItemSetOptions requirements)', () => {
    const weak = (items: Record<number, Item>) =>
      deriveCharacterStats({ charClass: CharacterClassNumber.DarkKnight, level: 1, strength: 20, agility: 20, vitality: 20, energy: 20, leadership: 0, items: Object.assign(new Array(12).fill(null), items), sets, options });
    expect(weak({ 2: piece(7, 6, 2), 3: piece(8, 6, 2) }).damageMax).toBe(weak({ 2: piece(7, 6, 0), 3: piece(8, 6, 0) }).damageMax);
  });

  it('adds the socket damage, defense, attack rate and block rate', () => {
    const sword = (seeds: number[], bonus = 0xff) => ({ group: 0, num: 26, durability: 60, sockets: seeds, socketCount: seeds.length, socketBonus: bonus });
    const plain = worn({ 0: sword([0xfe]) });
    // Seed 3 (minimum +20) and seed 2 at level 2 (maximum +32).
    const armed = worn({ 0: sword([3, 2 + 50]) });
    expect(armed.damageMin - plain.damageMin).toBe(20);
    expect(armed.damageMax - plain.damageMax).toBe(32);
    // Seed 19 (attack rate +25) and the mix bonus 0 (damage +11).
    const rated = worn({ 0: sword([19], 0) });
    expect(rated.attackRate - plain.attackRate).toBe(25);
    expect(rated.damageMin - plain.damageMin).toBe(11);
    const armor = (seeds: number[], bonus = 0xff) => ({ group: 8, num: 45, durability: 60, sockets: seeds, socketCount: seeds.length, socketBonus: bonus });
    const empty = worn({ 3: armor([0xfe]) });
    // Seed 11 (defense +30), the mix bonus 4 (defense +24), seed 10 (block rate +10%).
    expect(worn({ 3: armor([11], 4) }).defense - empty.defense).toBe(54);
    expect(worn({ 3: armor([10]) }).defenseRate).toBe(Math.trunc(empty.defenseRate * 1.1));
  });

  it('adds the socket skill and magic power bonuses to wizardry', () => {
    const staff = (seeds: number[], bonus = 0xff) => ({ group: 5, num: 30, durability: 60, sockets: seeds, socketCount: seeds.length, socketBonus: bonus });
    const plain = worn({ 1: staff([0xfe]) }, CharacterClassNumber.DarkWizard);
    // Seed 18 (skill attack +37), the mix bonus 2 (wizardry +5).
    const armed = worn({ 1: staff([18], 2) }, CharacterClassNumber.DarkWizard);
    expect(armed.wizardryMin - plain.wizardryMin).toBe(42);
    expect(armed.wizardryMax - plain.wizardryMax).toBe(42);
  });
});
