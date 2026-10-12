import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Item } from '@/ecs/world';
import { CharacterClassNumber } from '@/core/types';
import { itemOptionTables, itemSetTables, loadItemOptionTables, loadItemSetTables, type ItemOptionTables } from '@/controllers/assets';
import { itemStats } from '@/controllers/item_rules';
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

  // ZzzInfomation.cpp:3240-3246, PlusSpecialPercent's IsRequireEquipItem (:2302-2314).
  const worn = (pieces: Record<number, Item>, strength = 600) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    for (const [slot, item] of Object.entries(pieces)) items[Number(slot)] = item;
    return deriveCharacterStats({ charClass: CharacterClassNumber.DarkKnight, level: 240, strength, agility: 300, vitality: 100, energy: 450, leadership: 0, items }).defenseRate;
  };
  const excellent = { isExcellent: true, excellentFlags: 0x02 };

  it('adds 10% for each armour piece and ring with the defense success rate option, after the shield', () => {
    expect(worn({ 2: { group: 7, num: 0, durability: 30, ...excellent } })).toBe(Math.trunc(bare * 1.1));
    const both = Math.trunc(bare * 1.1);
    expect(worn({ 2: { group: 7, num: 0, durability: 30, ...excellent }, 10: { group: 13, num: 8, durability: 30, ...excellent } })).toBe(both + Math.trunc(both / 10));
    expect(worn({ 1: { group: 6, num: 12, durability: 52 }, 2: { group: 7, num: 0, durability: 30, ...excellent } })).toBe(Math.trunc((bare + 129) * 1.1));
  });

  it("drops a piece's options when its needs are unmet or it is broken", () => {
    expect(worn({ 2: { group: 7, num: 0, durability: 30, ...excellent } }, 20)).toBe(bare);
    expect(worn({ 2: { group: 7, num: 0, durability: 0, ...excellent } })).toBe(bare);
    expect(worn({ 1: { group: 6, num: 12, durability: 52, optionLevel: 2, ...excellent } }, 20)).toBe(bare + 159);
  });
});

// The window takes the magic percent from pWeaponRight, EQUIPMENT_WEAPON_RIGHT slot 0, and prints it on the selected skill's
// maximum: (int)((iMagicDamageMaxInitial + maxMg) * magicPercent) (NewUICharacterInfoWindow.cpp:509, :1226-1230, :1336-1352).
describe('the character window wizardry with a staff', () => {
  const held = (slot: number) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    items[slot] = { group: 5, num: 17, durability: 81 };
    return deriveCharacterStats({ charClass: CharacterClassNumber.DarkWizard, level: 240, strength: 600, agility: 300, vitality: 100, energy: 450, leadership: 0, items }).staffRate;
  };

  it("takes the Ancient Staff's magic power from the right hand (slot 0), not from slot 1", () => {
    // 38% of the 112 maximum.
    expect(held(0)).toBe(42);
    expect(held(1)).toBe(0);
  });

  // NewUICharacterInfoWindow.cpp:1336-1352: the magic swords too, worn by the MagicDur share.
  const stats = (item: Item, magicSkill?: { number: number; damage: number }) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    items[0] = item;
    return deriveCharacterStats({ charClass: CharacterClassNumber.MagicGladiator, level: 240, strength: 600, agility: 300, vitality: 100, energy: 450, leadership: 0, items, magicSkill });
  };
  const rate = (item: Item) => stats(item).staffRate;

  it('reads the Rune Blade, Explosion Blade, Sword Dancer, Dark Reign Blade and Imperial Sword', () => {
    expect(rate({ group: 0, num: 31, durability: 93 })).toBe(58);
    for (const num of [21, 23, 25, 28]) expect(rate({ group: 0, num, durability: 90 })).toBeGreaterThan(0);
    expect(rate({ group: 0, num: 26, durability: 90 })).toBe(0);
  });

  it("loses half of the Legendary Staff's rate below 20% of its MagicDur", () => {
    expect(rate({ group: 5, num: 5, durability: 66 })).toBe(32);
    expect(rate({ group: 5, num: 5, durability: 10 })).toBe(16);
  });

  // GetMagicSkillDamage (CharacterManager.cpp:341-370): the skill's Damage on the minimum, Damage * 1.5 on the maximum.
  it("adds the selected skill's damage and reads the rate on that maximum", () => {
    const legendary = { group: 5, num: 5, durability: 66 };
    expect(stats(legendary, { number: 5, damage: 25 })).toMatchObject({ wizardryMin: 75, wizardryMax: 149, staffRate: 43 });
    // The summoner's curse skills read the plain magic damage.
    expect(stats(legendary, { number: 223, damage: 60 })).toMatchObject({ wizardryMin: 50, wizardryMax: 112, staffRate: 32 });
  });
});

// CalculateMagicDamage adds the item's AT_IMPROVE_MAGIC options, not its damage (ZzzInfomation.cpp:2848-3001).
describe('the wizardry of a held staff', () => {
  const wizardry = (pieces: Record<number, Item>, strength = 600) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    for (const [slot, item] of Object.entries(pieces)) items[Number(slot)] = item;
    return deriveCharacterStats({ charClass: CharacterClassNumber.DarkWizard, level: 240, strength, agility: 300, vitality: 100, energy: 450, leadership: 0, items });
  };
  const staff = (more: Partial<Item> = {}): Item => ({ group: 5, num: 5, durability: 66, ...more });

  it("leaves out the Legendary Staff's damage", () => {
    expect(wizardry({ 0: staff() })).toMatchObject({ wizardryMin: 50, wizardryMax: 112 });
  });

  it('adds +4 per option level, and nothing when the staff is broken or its strength is unmet', () => {
    expect(wizardry({ 0: staff({ optionLevel: 2 }) })).toMatchObject({ wizardryMin: 58, wizardryMax: 120 });
    expect(wizardry({ 0: staff({ optionLevel: 2, durability: 0 }) })).toMatchObject({ wizardryMin: 50, wizardryMax: 112 });
    expect(wizardry({ 0: staff({ optionLevel: 2 }) }, 20)).toMatchObject({ wizardryMin: 50, wizardryMax: 112 });
  });

  it('adds the excellent level / 20 and 2% wizardry', () => {
    expect(wizardry({ 0: staff({ isExcellent: true, excellentFlags: 0x10 }) })).toMatchObject({ wizardryMin: 62, wizardryMax: 124 });
    expect(wizardry({ 0: staff({ isExcellent: true, excellentFlags: 0x08 }) })).toMatchObject({ wizardryMin: 51, wizardryMax: 114 });
  });

  it("adds the staff's option again with anything in the left hand, as the original does (:2950-2979)", () => {
    expect(wizardry({ 0: staff({ optionLevel: 2 }), 1: { group: 6, num: 0, durability: 22 } })).toMatchObject({ wizardryMin: 66, wizardryMax: 128 });
  });

  // IsRequireEquipItem reads Strength + AddStrength (ZzzInfomation.cpp:2237): a worn piece's ancient +5 strength counts.
  it("meets the staff's strength with a worn ancient bonus", () => {
    const need = itemStats(staff({ optionLevel: 2 }))?.reqStr ?? 0;
    const pendant = { group: 13, num: 13, durability: 255, ancientBonusLevel: 1 };
    expect(wizardry({ 0: staff({ optionLevel: 2 }) }, need - 5)).toMatchObject({ wizardryMin: 50 });
    expect(wizardry({ 0: staff({ optionLevel: 2 }), 9: pendant }, need - 5)).toMatchObject({ wizardryMin: 58 });
  });

  // A staff's harmony: option 1 magic power (maxMg on the line and the rate, NewUICharacterInfoWindow.cpp:1241-1256, :1352),
  // option 2 cuts the strength IsRequireEquipItem needs (ZzzInfomation.cpp:2246-2259); each once the level reaches the option's.
  const harmony: ItemOptionTables = {
    harmony: [[], [{ name: 'magic', values: [6, 8, 10, 12] }, { name: 'strength', values: [10, 15, 20, 25] }], []],
    sockets: [[], [], []],
    addOptions: [],
  };
  const harmonized = (pieces: Record<number, Item>, strength = 600, options: ItemOptionTables | null = harmony) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    for (const [slot, item] of Object.entries(pieces)) items[Number(slot)] = item;
    return deriveCharacterStats({ charClass: CharacterClassNumber.DarkWizard, level: 240, strength, agility: 300, vitality: 100, energy: 450, leadership: 0, items, options });
  };

  it("adds a staff's harmony magic power to the wizardry line and the rate", () => {
    const plain = harmonized({ 0: staff({ lvl: 2 }) }, 600, null);
    const lit = harmonized({ 0: staff({ lvl: 2, socketBonus: 0x12 }) });
    expect(lit).toMatchObject({ wizardryMin: plain.wizardryMin + 10, wizardryMax: plain.wizardryMax + 10 });
    expect(lit.staffRate).toBeGreaterThan(plain.staffRate);
    expect(harmonized({ 0: staff({ lvl: 1, socketBonus: 0x12 }) }).wizardryMin).toBe(harmonized({ 0: staff({ lvl: 1 }) }).wizardryMin);
  });

  it("meets the staff's strength with its harmony strength cut", () => {
    const item = staff({ lvl: 3, optionLevel: 2 });
    const need = itemStats(item)?.reqStr ?? 0;
    expect(harmonized({ 0: item }, need - 25).wizardryMin).toBe(harmonized({ 0: staff({ lvl: 3 }) }, need - 25).wizardryMin);
    const cut = harmonized({ 0: { ...item, socketBonus: 0x23 } }, need - 25).wizardryMin;
    expect(cut).toBe(harmonized({ 0: item }).wizardryMin);
  });

  it("adds the Wings of Heaven's option, and a Wizard's Ring's 10%", () => {
    expect(wizardry({ 7: { group: 12, num: 1, durability: 200, optionLevel: 1 } })).toMatchObject({ wizardryMin: 54, wizardryMax: 116 });
    expect(wizardry({ 10: { group: 13, num: 20, durability: 30 } })).toMatchObject({ wizardryMin: 55, wizardryMax: 123 });
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

// CalculateCurseDamage (ZzzInfomation.cpp:3045-3104), GetCurseSkillDamage (CharacterManager.cpp:373-390) and the book's
// curse rate on the line's maximum (NewUICharacterInfoWindow.cpp:1381-1466).
describe('the character window curse line', () => {
  const curse = (pieces: Record<number, Item>, magicSkill?: { number: number; damage: number }, charClass = CharacterClassNumber.Summoner) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    for (const [slot, item] of Object.entries(pieces)) items[Number(slot)] = item;
    return deriveCharacterStats({ charClass, level: 240, strength: 600, agility: 300, vitality: 100, energy: 450, leadership: 0, items, magicSkill });
  };
  const book = (more: Partial<Item> = {}): Item => ({ group: 5, num: 21, durability: 60, ...more });

  it("adds the curse skills' damage, and only theirs", () => {
    expect(curse({}, { number: 223, damage: 40 })).toMatchObject({ curseMin: 90, curseMax: 172 });
    expect(curse({}, { number: 5, damage: 25 })).toMatchObject({ curseMin: 50, curseMax: 112 });
  });

  it("adds the left hand book's option and excellent wizardry bits, and the wing's curse option", () => {
    expect(curse({ 1: book({ optionLevel: 2 }) })).toMatchObject({ curseMin: 58, curseMax: 120 });
    expect(curse({ 0: book({ optionLevel: 2 }) })).toMatchObject({ curseMin: 50, curseMax: 112 });
    expect(curse({ 1: book({ optionLevel: 2, durability: 0 }) })).toMatchObject({ curseMin: 50, curseMax: 112 });
    expect(curse({ 1: book({ isExcellent: true, excellentFlags: 0x10 }) })).toMatchObject({ curseMin: 62, curseMax: 124 });
    expect(curse({ 7: { group: 12, num: 42, durability: 255, optionLevel: 1 } }, undefined, CharacterClassNumber.BloodySummoner).curseMin).toBe(54);
  });

  it("reads the left hand book's magic power on the line's maximum", () => {
    expect(curse({ 1: book({ optionLevel: 2 }) }).curseRate).toBe(27);
    expect(curse({}).curseRate).toBe(0);
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
