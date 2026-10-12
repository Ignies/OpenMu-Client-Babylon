import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Item } from '@/ecs/world';
import { CharacterClassNumber } from '@/core/types';
import { itemOptionTables, itemSetTables, loadItemOptionTables, loadItemSetTables, type ItemOptionTables } from '@/controllers/assets';
import { itemStats } from '@/controllers/item_rules';
import { deriveCharacterStats, windowAttackSpeed } from './characterStats';

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

  // :719-733, :1305-1320, :1424-1440: the Demon and the Skeleton add nothing once expired; the Imp is not checked.
  it('adds nothing for an expired Demon or Skeleton, still the Imp', () => {
    const expired = { raw: [0, 0, 0, 0, 0, 0x06, 0] };
    for (const num of [64, 123]) {
      const with_ = stats(helper(num, expired));
      expect([with_.damageMin, with_.damageMax, with_.wizardryMax]).toEqual([bare.damageMin, bare.damageMax, bare.wizardryMax]);
      expect(stats(helper(num, expired), CharacterClassNumber.Summoner).curseMax).toBe(bareSummoner.curseMax);
    }
    expect(stats(helper(1, expired)).damageMin).toBe(bare.damageMin + Math.trunc(bare.damageMin * 0.3));
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

  // NewUICharacterInfoWindow.cpp:1058-1068: worn with durability and its needs met.
  it('turns the attack speed line magenta for the Demon and the Skeleton', () => {
    expect(stats(helper(64)).petEvent).toBe('attackSpeed');
    expect(stats(helper(123)).petEvent).toBe('attackSpeed');
    expect(stats(helper(64, { durability: 0 })).petEvent).toBeNull();
    expect(stats(helper(64, { raw: [0, 0, 0, 0, 0, 0x06, 0] })).petEvent).toBeNull();
    expect(stats(helper(64, { raw: [0, 0, 0, 0, 0, 0x02, 0] })).petEvent).toBe('attackSpeed');
    expect(stats(helper(1)).petEvent).toBeNull();
    expect(bare.petEvent).toBeNull();
    const items: (Item | null)[] = new Array(12).fill(null);
    items[PET_SLOT] = helper(64);
    const unmet = deriveCharacterStats({ charClass: CharacterClassNumber.DarkKnight, level: 0, strength: 20, agility: 20, vitality: 20, energy: 10, leadership: 0, items });
    expect(unmet.petEvent).toBeNull();
  });

  // NewUICharacterInfoWindow.cpp:1144-1153.
  it('turns the HP line magenta for the Spirit of Guardian', () => {
    expect(stats(helper(65)).petEvent).toBe('hp');
    expect(stats(helper(65, { durability: 0 })).petEvent).toBeNull();
    expect(stats(helper(65, { raw: [0, 0, 0, 0, 0, 0x06, 0] })).petEvent).toBeNull();
  });
});

// NewUICharacterInfoWindow.cpp:1039-1040: the wizard and the summoner read MagicSpeed.
describe('the character window attack speed line', () => {
  it("prints the server's speed, else the agility one, magic speed for the wizard and summoner", () => {
    expect(windowAttackSpeed(CharacterClassNumber.DarkKnight, { attackSpeed: 40, magicSpeed: 20 }, { attack: 300, magic: 200 })).toBe(300);
    expect(windowAttackSpeed(CharacterClassNumber.SoulMaster, { attackSpeed: 40, magicSpeed: 20 }, { attack: 300, magic: 200 })).toBe(200);
    expect(windowAttackSpeed(CharacterClassNumber.Summoner, { attackSpeed: 40, magicSpeed: 20 }, { attack: null, magic: null })).toBe(20);
    expect(windowAttackSpeed(CharacterClassNumber.FairyElf, { attackSpeed: 40, magicSpeed: 20 }, { attack: null, magic: null })).toBe(40);
  });
});

// The damage line goes blue when GetAttackDamage returns true (NewUICharacterInfoWindow.cpp:490, :765; ZzzInventory.cpp:5937-5966).
describe('the character window damage line colour', () => {
  const held = (charClass: CharacterClassNumber, right: Item | null, left: Item | null) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    items[0] = right;
    items[1] = left;
    return deriveCharacterStats({ charClass, level: 400, strength: 1000, agility: 1000, vitality: 100, energy: 1000, leadership: 0, items }).damageBlue;
  };
  const weapon = (group: number, num: number, lvl = 0): Item => ({ group, num, lvl, durability: 255 });

  it('is blue for the knight and gladiator with two weapons up to staffs, the fighter up to maces', () => {
    expect(held(CharacterClassNumber.DarkKnight, weapon(0, 0), weapon(1, 0))).toBe(true);
    expect(held(CharacterClassNumber.MagicGladiator, weapon(0, 0), weapon(5, 0))).toBe(true);
    expect(held(CharacterClassNumber.DarkKnight, weapon(0, 0), weapon(6, 0))).toBe(false);
    expect(held(CharacterClassNumber.RageFighter, weapon(0, 0), weapon(2, 0))).toBe(true);
    expect(held(CharacterClassNumber.RageFighter, weapon(0, 0), weapon(3, 0))).toBe(false);
  });

  it('is blue for the elf with a bow and +1 arrows or a crossbow and +1 bolts', () => {
    expect(held(CharacterClassNumber.FairyElf, weapon(4, 15, 1), weapon(4, 0))).toBe(true);
    expect(held(CharacterClassNumber.FairyElf, weapon(4, 8), weapon(4, 7, 2))).toBe(true);
    expect(held(CharacterClassNumber.FairyElf, weapon(4, 15, 0), weapon(4, 0))).toBe(false);
    expect(held(CharacterClassNumber.FairyElf, weapon(4, 8), weapon(4, 7, 0))).toBe(false);
    expect(held(CharacterClassNumber.FairyElf, weapon(4, 15, 1), null)).toBe(false);
  });

  // CalculateDamage's bow formula, agility / 7 + strength / 14, for every bow and crossbow with durability
  // (ZzzInfomation.cpp:2557; IsGeneralBowItem and IsGeneralCrossbowItem, CharacterManager.cpp:84-96).
  it('reads the bow formula for the later bows and crossbows too, not for a broken one', () => {
    const strengthShare = (slot: number, num: number, durability = 255) => {
      const of = (strength: number) => {
        const items: (Item | null)[] = new Array(12).fill(null);
        items[slot] = { group: 4, num, durability };
        return deriveCharacterStats({ charClass: CharacterClassNumber.FairyElf, level: 400, strength, agility: 0, vitality: 100, energy: 100, leadership: 0, items }).damageMin;
      };
      return of(1400) - of(0);
    };
    for (const num of [17, 20, 24]) expect(strengthShare(1, num)).toBe(100);
    for (const num of [16, 18, 19]) expect(strengthShare(0, num)).toBe(100);
    expect(strengthShare(1, 0, 0)).toBe(200);
  });

  // GetAttackDamage reads the item dragged out of a hand slot as still held (ZzzInventory.cpp:5900-5911).
  it('stays blue while a weapon is dragged out of a hand slot, on the damage left without it', () => {
    const dragging = (slot: number) => {
      const items: (Item | null)[] = new Array(12).fill(null);
      items[1 - slot] = weapon(0, 0);
      const input = { charClass: CharacterClassNumber.DarkKnight, level: 400, strength: 1000, agility: 1000, vitality: 100, energy: 1000, leadership: 0, items };
      return { bare: deriveCharacterStats(input), dragged: deriveCharacterStats({ ...input, picked: { slot, item: weapon(1, 0) } }) };
    };
    for (const slot of [0, 1]) {
      const { bare, dragged } = dragging(slot);
      expect(bare.damageBlue).toBe(false);
      expect(dragged.damageBlue).toBe(true);
      // 55% of each hand, the emptied one on strength alone (1000 / 6, 1000 / 4).
      expect(dragged.damageMin).toBe(Math.trunc((166 * 55) / 100) + Math.trunc((bare.damageMin * 55) / 100));
      expect(dragged.damageMax).toBe(Math.trunc((250 * 55) / 100) + Math.trunc((bare.damageMax * 55) / 100));
    }
    // An item dragged from elsewhere changes nothing.
    const { bare } = dragging(0);
    const items: (Item | null)[] = new Array(12).fill(null);
    items[1] = weapon(0, 0);
    expect(deriveCharacterStats({ charClass: CharacterClassNumber.DarkKnight, level: 400, strength: 1000, agility: 1000, vitality: 100, energy: 1000, leadership: 0, items, picked: { slot: 5, item: weapon(1, 0) } })).toEqual(bare);
  });
});

// eBuff_Def_up_Ourforces: rate * (10 + (Energy - 80) / 10, at most 100) / 100 (NewUICharacterInfoWindow.cpp:966-975).
describe("the character window under the Rage Fighter's defense buff (131)", () => {
  const blocking = (energy: number, buffs: number[]) =>
    deriveCharacterStats({ charClass: CharacterClassNumber.DarkKnight, level: 240, strength: 600, agility: 300, vitality: 100, energy, leadership: 0, items: [], buffs });

  it('adds a share of the defense rate by energy', () => {
    const rate = blocking(450, []).defenseRate;
    expect(blocking(450, []).blockingBuff).toBe(0);
    expect(blocking(450, [131]).blockingBuff).toBe(Math.trunc((rate * 47) / 100));
    expect(blocking(2000, [131]).blockingBuff).toBe(rate);
    expect(blocking(20, [131]).blockingBuff).toBe(Math.trunc((rate * 4) / 100));
  });
});

// CalculateDamage (ZzzInfomation.cpp:2629-2764): the weapons' and wing's options, durability and excellent bits, the
// pendant, the rings and the arrows.
describe('the character window damage with options', () => {
  const knight = (pieces: Record<number, Item>) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    for (const [slot, item] of Object.entries(pieces)) items[Number(slot)] = item;
    return deriveCharacterStats({ charClass: CharacterClassNumber.DarkKnight, level: 400, strength: 1000, agility: 1000, vitality: 100, energy: 100, leadership: 0, items });
  };
  const kris = (more: Partial<Item> = {}): Item => ({ group: 0, num: 0, durability: 255, ...more });
  const base = knight({ 0: kris() });

  it("adds the weapon's option, nothing from a broken weapon", () => {
    expect(knight({ 0: kris({ optionLevel: 2 }) }).damageMin).toBe(base.damageMin + 8);
    expect(knight({ 0: kris({ durability: 0 }) }).damageMin).toBe(knight({}).damageMin);
  });

  it("adds the weapon's and the damage pendant's excellent level / 20 and 2%", () => {
    expect(knight({ 0: kris({ excellentFlags: 0x10 }) }).damageMax).toBe(base.damageMax + 20);
    expect(knight({ 0: kris({ excellentFlags: 0x08 }) }).damageMax).toBe(base.damageMax + Math.trunc((base.damageMax * 2) / 100));
    expect(knight({ 0: kris(), 9: { group: 13, num: 13, durability: 255, excellentFlags: 0x10 } }).damageMax).toBe(base.damageMax + 20);
    expect(knight({ 0: kris(), 9: { group: 13, num: 12, durability: 255, excellentFlags: 0x10 } }).damageMax).toBe(base.damageMax);
  });

  it("adds the wing's damage option and the Wizard's Ring's 10%", () => {
    expect(knight({ 0: kris(), 7: { group: 12, num: 2, durability: 255, optionLevel: 2 } }).damageMin).toBe(base.damageMin + 8);
    expect(knight({ 0: kris(), 10: { group: 13, num: 20, lvl: 0, durability: 255 } }).damageMin).toBe(base.damageMin + Math.trunc(base.damageMin / 10));
  });

  it('adds the +1 or better arrows share to the bow (:2769-2784)', () => {
    const elf = (arrows: number) => {
      const items: (Item | null)[] = new Array(12).fill(null);
      items[1] = { group: 4, num: 0, durability: 255 };
      items[0] = { group: 4, num: 15, lvl: arrows, durability: 255 };
      return deriveCharacterStats({ charClass: CharacterClassNumber.FairyElf, level: 400, strength: 100, agility: 700, vitality: 100, energy: 100, leadership: 0, items }).damageMin;
    };
    expect(elf(2)).toBe(elf(0) + Math.trunc(Math.fround(elf(0) * Math.fround(5 * Math.fround(0.01))) + 1));
  });
});

// CalculateDefense (ZzzInfomation.cpp:3251-3322): the left hand to the wing, unbroken, with the option, worn by
// durability; then 5% to 30% for a whole +10 to +15 set (CheckFullSet, ZzzCharacter.cpp:5386-5470).
describe('the character window defense with items', () => {
  const knight = (pieces: Record<number, Item>, charClass = CharacterClassNumber.DarkKnight) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    for (const [slot, item] of Object.entries(pieces)) items[Number(slot)] = item;
    return deriveCharacterStats({ charClass, level: 400, strength: 1000, agility: 300, vitality: 300, energy: 300, leadership: 0, items }).defense;
  };
  const piece = (slot: number, more: Partial<Item> = {}): Item => ({ group: slot + 5, num: 0, durability: 255, ...more });
  const bare = knight({});

  it('reads the left hand to the wing, not the right hand', () => {
    expect(knight({ 0: { group: 6, num: 0, durability: 255 } })).toBe(bare);
    expect(knight({ 1: { group: 6, num: 0, durability: 255 } })).toBeGreaterThan(bare);
  });

  it("adds the option's +4 per level, nothing from a broken piece", () => {
    expect(knight({ 2: piece(2, { optionLevel: 2 }) })).toBe(knight({ 2: piece(2) }) + 8);
    expect(knight({ 2: piece(2, { durability: 0 }) })).toBe(bare);
  });

  it('adds 5% for a whole +10 set, nothing with one piece at +9', () => {
    const set = (level: number, boots = level) => ({ 2: piece(2, { lvl: level }), 3: piece(3, { lvl: level }), 4: piece(4, { lvl: level }), 5: piece(5, { lvl: level }), 6: piece(6, { lvl: boots }) });
    const { 6: _boots, ...four } = set(10);
    const items = knight(four) - bare + knight({ 6: piece(6, { lvl: 10 }) }) - bare;
    expect(knight(set(10))).toBe(bare + items + Math.trunc(Math.fround((bare + items) * Math.fround(0.05))));
    const nine = knight({ 6: piece(6, { lvl: 9 }) }) - bare;
    expect(knight(set(10, 9))).toBe(bare + knight(four) - bare + nine);
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
    expect(held(1)).toBeNull();
  });

  // The line keeps its "(+N)" while a staff is held, "(+0)" included (:1336-1353).
  it('reads 0, not null, for a staff whose rate truncates to nothing', () => {
    const items: (Item | null)[] = new Array(12).fill(null);
    items[0] = { group: 5, num: 0, durability: 20 };
    expect(deriveCharacterStats({ charClass: CharacterClassNumber.DarkWizard, level: 1, strength: 18, agility: 18, vitality: 15, energy: 20, leadership: 0, items }).staffRate).toBe(0);
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
    expect(rate({ group: 0, num: 26, durability: 90 })).toBeNull();
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
    expect(lit.staffRate).toBeGreaterThan(plain.staffRate ?? 0);
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

// The formulas read Strength + AddStrength and the rest (ZzzInfomation.cpp:2550-2553, :2851, :3051, :3108-3110, :3201, :3255-3256).
describe('the character window with stats the worn items add', () => {
  // A pendant with ancient bonus level 2 adds +10 to its AttType stat, strength (getAllAddState).
  const pendant = { group: 13, num: 13, durability: 255, ancientBonusLevel: 2 };
  const knight = (pieces: Record<number, Item>) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    for (const [slot, item] of Object.entries(pieces)) items[Number(slot)] = item;
    return deriveCharacterStats({ charClass: CharacterClassNumber.DarkKnight, level: 240, strength: 600, agility: 300, vitality: 100, energy: 450, leadership: 0, items });
  };

  it('reads the added strength in the damage and the attack rate', () => {
    const bare = knight({});
    expect(knight({ 9: pendant })).toMatchObject({ damageMin: 101, damageMax: 152, attackRate: bare.attackRate + 2 });
    expect(knight({ 9: pendant }).totals).toEqual({ str: 610, agi: 300, vit: 100, ene: 450, cmd: 0 });
  });

  // The rows print Strength + AddStrength, in blue while AddStrength is not 0 (NewUICharacterInfoWindow.cpp:463-475).
  it('keeps what the items add apart for the rows', () => {
    expect(knight({ 9: pendant }).added).toEqual({ str: 10, agi: 0, vit: 0, ene: 0, cmd: 0 });
    expect(knight({}).added).toEqual({ str: 0, agi: 0, vit: 0, ene: 0, cmd: 0 });
  });

  // eBuff_Hp_up_Ourforces adds 30 + (Energy - 132) / 10 vitality, at most 200, from 132 energy (ZzzInfomation.cpp:3492-3503).
  it("adds the Rage Fighter's vitality buff (130) to vitality", () => {
    const fighter = (energy: number, buffs: number[]) =>
      deriveCharacterStats({ charClass: CharacterClassNumber.RageFighter, level: 240, strength: 600, agility: 300, vitality: 100, energy, leadership: 0, items: [], buffs });
    expect(fighter(450, [130]).totals.vit).toBe(100 + 30 + 31);
    expect(fighter(450, [130]).added.vit).toBe(61);
    expect(fighter(131, [130]).totals.vit).toBe(100);
    expect(fighter(5000, [130]).totals.vit).toBe(300);
    expect(fighter(450, []).totals.vit).toBe(100);
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
    // No book, no rate: the line drops its "(+N)" (:1449-1461); with a book it shows even "(+0)".
    expect(curse({}).curseRate).toBeNull();
  });
});

// The window's own harmony (GetStrengthenCapability, UIJewelHarmony.cpp:244-323) and 380 sums: the two hands' attack power
// on the damage line (NewUICharacterInfoWindow.cpp:554-582, :741-758), their attack rate and the 380 attack on the PvP
// attack rate (:586-610, :631-668, :794-796), the armour's defense rate and the 380 defense on the PvP defense rate
// (:612-629, :1073-1075), and the armour's defense on the defense line, not its "(+N)" (:928-952, :1003-1013).
describe('the character window with harmony and 380 options', () => {
  const steps = (from: number) => ({ name: '', values: Array.from({ length: 14 }, (_, i) => from + i) });
  const addOptions: ItemOptionTables['addOptions'][number][] = [];
  addOptions[0] = [[1, 7], [0, 0]];
  addOptions[8 * 512] = [[3, 9], [0, 0]];
  const options: ItemOptionTables = {
    harmony: [
      [steps(10), steps(20), null, null, steps(30), null, null, steps(40)],
      [null, null, null, null, null, null, steps(50)],
      [steps(60), null, null, null, null, steps(70)],
    ],
    sockets: [[], [], []],
    addOptions,
  };
  const knight = (pieces: Record<number, Item>, tables: ItemOptionTables | null = options) => {
    const items: (Item | null)[] = new Array(12).fill(null);
    for (const [slot, item] of Object.entries(pieces)) items[Number(slot)] = item;
    return deriveCharacterStats({ charClass: CharacterClassNumber.DarkKnight, level: 240, strength: 600, agility: 300, vitality: 100, energy: 450, leadership: 0, items, options: tables });
  };
  const kris = (more: Partial<Item> = {}): Item => ({ group: 0, num: 0, durability: 20, lvl: 5, ...more });
  const armour = (more: Partial<Item> = {}): Item => ({ group: 8, num: 0, durability: 30, lvl: 5, ...more });
  const plain = knight({ 0: kris(), 1: kris(), 3: armour() });

  it("adds the hands' harmony minimum and maximum attack power to the damage line", () => {
    expect(knight({ 0: kris({ socketBonus: 0x13 }), 1: kris(), 3: armour() })).toMatchObject({ damageMin: plain.damageMin + 13, damageMax: plain.damageMax });
    expect(knight({ 0: kris(), 1: kris({ socketBonus: 0x22 }), 3: armour() })).toMatchObject({ damageMin: plain.damageMin, damageMax: plain.damageMax + 22 });
    expect(knight({ 0: kris({ socketBonus: 0x51 }), 1: kris(), 3: armour() })).toMatchObject({ damageMin: plain.damageMin + 31, damageMax: plain.damageMax + 31 });
    // Below the option's level the jewel gives nothing.
    expect(knight({ 0: kris({ socketBonus: 0x16 }), 1: kris(), 3: armour() }).damageMin).toBe(plain.damageMin);
  });

  it("adds the hands' harmony attack rate and the 380 attack to the PvP attack rate's (+N)", () => {
    expect(plain.attackRatePvpBonus).toBe(0);
    expect(knight({ 0: kris({ socketBonus: 0x82 }) }).attackRatePvpBonus).toBe(42);
    expect(knight({ 0: { group: 5, num: 0, durability: 20, lvl: 5, socketBonus: 0x73 } }).attackRatePvpBonus).toBe(53);
    expect(knight({ 0: kris({ raw: [0, 0, 0, 0, 0, 0x08] }) }).attackRatePvpBonus).toBe(7);
  });

  it("adds the armour's harmony defense rate and the 380 defense to the PvP defense rate's (+N)", () => {
    expect(plain.defenseRatePvpBonus).toBe(0);
    expect(knight({ 3: armour({ socketBonus: 0x61 }) }).defenseRatePvpBonus).toBe(71);
    expect(knight({ 3: armour({ raw: [0, 0, 0, 0, 0, 0x08] }) }).defenseRatePvpBonus).toBe(9);
  });

  it("adds the armour's harmony defense to the defense line and keeps it apart for the full set's (+N)", () => {
    const lit = knight({ 0: kris(), 1: kris(), 3: armour({ socketBonus: 0x14 }) });
    expect(lit).toMatchObject({ defense: plain.defense + 64, harmonyDefense: 64 });
    expect(plain.harmonyDefense).toBe(0);
  });

  // iChangeRingAddDefense = (t_adjdef + maxdefense) / 10 with either ring, before the Panda's 50 (:946-957).
  it('adds a tenth of the defense, harmony included, for the elite skeleton ring', () => {
    const ring = { group: 13, num: 39, durability: 255 };
    const lit = knight({ 0: kris(), 1: kris(), 3: armour({ socketBonus: 0x14 }) });
    expect(knight({ 0: kris(), 1: kris(), 3: armour(), 11: ring }).defense).toBe(plain.defense + Math.trunc(plain.defense / 10));
    expect(knight({ 0: kris(), 1: kris(), 3: armour({ socketBonus: 0x14 }), 10: ring }).defense).toBe(lit.defense + Math.trunc(lit.defense / 10));
    expect(knight({ 0: kris(), 1: kris(), 3: armour(), 8: helper(80), 10: ring }).defense).toBe(plain.defense + Math.trunc(plain.defense / 10) + 50);
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
