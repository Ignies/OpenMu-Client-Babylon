import type { Item } from '../ecs/world';
import { ItemsDatabase } from './itemsDatabase';
import {
  ItemGroup,
  calcMaxDurability,
  isCapeOfFighter,
  isCapeOfLord,
  isFirstWing,
  isThirdWing,
  itemDef,
  type ItemDef,
} from './itemStats';

/**
 * Zen values the way the original client computes them for the shop and
 * repair windows: `ItemValue` (ZzzInfomation.cpp:1457), `CalcRepairCost`
 * (ZzzInventory.cpp:1201), `IsSellingBan` / `IsRepairBan`
 * (ZzzInventory.cpp:7812/7887). The server has the final say; these are the
 * numbers the tooltips and the repair bar show.
 */

/** `goldType` of `ItemValue`: 0 = NPC buy price, 1 = sell price, 2 = repair base. */
export type GoldType = 0 | 1 | 2;

const idiv = (a: number, b: number) => Math.trunc(a / b);

/** `Gold / 100 * 100` above 1000, `/ 10 * 10` above 100. */
function roundGold(gold: number): number {
  if (gold >= 1000) return idiv(gold, 100) * 100;
  if (gold >= 100) return idiv(gold, 10) * 10;
  return gold;
}

/** Raw `items.json` columns `ItemDef` does not carry (`iZen`, `Value`). */
function rawColumns(def: ItemDef): { zen: number; value: number } {
  const raw = ItemsDatabase.getItem(def.group, def.index) as
    | Record<string, unknown>
    | null;
  const zen = typeof raw?.Zen === 'number' ? raw.Zen : 0;
  const value = typeof raw?.Valor === 'number' ? raw.Valor : 0;
  return { zen, value };
}

/** `Level2` bonus for +5…+15 items (the `switch (Level)` table). */
const LEVEL_BONUS = [0, 0, 0, 0, 0, 4, 10, 25, 45, 65, 95, 135, 185, 245, 305, 365];

/** `AT_IMPROVE_DAMAGE` & co: +4/+8/+12/+16 option tiers. */
function optionMultiplier(value: number): number {
  switch (value) {
    case 4:
      return 6 / 10;
    case 8:
      return 14 / 10;
    case 12:
      return 28 / 10;
    case 16:
      return 56 / 10;
    default:
      return 0;
  }
}

function isPotionLike(def: ItemDef): boolean {
  // ITEM_POTION..ITEM_ANTIDOTE: apple, the healing / mana potions, antidote.
  return def.group === ItemGroup.Potion && def.index <= 8;
}

function countBits(flags: number): number {
  let n = 0;
  for (let f = flags & 0xff; f; f >>= 1) n += f & 1;
  return n;
}

/** `ItemValue(ip, goldType)`; -1 never happens here (no pets). */
export function itemValue(item: Item, goldType: GoldType): number {
  const def = itemDef(item.group, item.num);
  if (!def) return 0;

  const { zen, value } = rawColumns(def);
  const level = item.lvl ?? 0;
  const durability = item.durability ?? 0;
  const { group, index } = def;

  if (zen !== 0) {
    let gold = zen;
    if (goldType) gold = idiv(gold, 3);
    return roundGold(gold);
  }

  const excellent = (item.excellentFlags ?? 0) !== 0 || item.isExcellent === true;
  let level2 = def.level + level * 3;
  if (excellent) level2 += 25;

  let gold = 0;

  const isJewelOfBless = group === ItemGroup.Potion && index === 13;
  const isJewelOfSoul = group === ItemGroup.Potion && index === 14;
  const isJewelOfChaos = group === ItemGroup.Wing && index === 15;
  const isJewelOfLife = group === ItemGroup.Potion && index === 16;
  const isJewelOfCreation = group === ItemGroup.Potion && index === 22;
  const isJewelOfGuardian = group === ItemGroup.Potion && index === 31;

  if (group === ItemGroup.Bow && index === 7) {
    // Bolts
    const sell = [100, 1400, 2200, 3000][Math.min(level, 3)];
    if (def.durability > 0) gold = idiv(sell * durability, def.durability);
  } else if (group === ItemGroup.Bow && index === 15) {
    // Arrows
    const sell = [70, 1200, 2000, 2800][Math.min(level, 3)];
    if (def.durability > 0) gold = idiv(sell * durability, def.durability);
  } else if (isJewelOfBless) {
    gold = 9000000;
  } else if (isJewelOfSoul) {
    gold = 6000000;
  } else if (isJewelOfChaos) {
    gold = 810000;
  } else if (isJewelOfLife) {
    gold = 45000000;
  } else if (isJewelOfCreation) {
    gold = 36000000;
  } else if (isJewelOfGuardian) {
    gold = 60000000;
  } else if (group === ItemGroup.Helper && index === 14) {
    // Loch's Feather / Crest of Monarch
    gold = level === 0 ? 180000 : 7500000;
  } else if (group === ItemGroup.Helper && index === 3) {
    // Horn of Dinorant: +300,000 per option
    gold = 960000 + 300000 * countBits(item.excellentFlags ?? 0);
  } else if (group === ItemGroup.Helper && index === 15) {
    // Fruits
    gold = 33000000;
  } else if (group === ItemGroup.Helper && (index === 16 || index === 17)) {
    // Scroll of Archangel / Blood Bone
    gold = [0, 10000, 50000, 100000, 300000, 500000, 800000, 1000000, 1200000][
      Math.min(level, 8)
    ];
  } else if (group === ItemGroup.Helper && index === 18) {
    // Invisibility Cloak
    gold = (level === 1 ? 50000 : 200000 + 20000 * (level - 1)) * 3;
  } else if (group === ItemGroup.Potion && index === 9 && level === 1) {
    // Ale
    gold = 1000;
  } else if (group === ItemGroup.Potion && index === 10) {
    // Town Portal Scroll
    gold = 750;
  } else if (group === ItemGroup.Potion && index === 7) {
    // Siege Potion
    gold = (level === 0 ? 900000 : 450000) * durability;
  } else if (group === ItemGroup.Helper && index === 7) {
    // Contract (Summon)
    gold = level === 0 ? 1500000 : 1200000;
  } else if (group === ItemGroup.Helper && index === 11) {
    // Life Stone
    gold = level === 0 ? 100000 : 2400000;
  } else if (group === ItemGroup.Helper && index === 20) {
    // Wizard's Ring
    gold = level === 0 ? 3000 : 0;
  } else if (group === ItemGroup.Helper && index === 31) {
    // Spirit (Dark Horse / Raven spirit)
    gold = (level === 0 ? 10000000 : 5000000) * 3;
  } else if (value > 0 && isPotionLike(def)) {
    // ITEM_POTION..ITEM_ANTIDOTE: Value² · 10 / 12, doubled per level, per unit.
    gold = idiv(value * value * 10, 12);
    if (index === 3 || index === 6) gold = 1500; // large healing / mana potion
    if (level > 0) gold *= 2 ** level;
    gold = idiv(gold, 10) * 10;
    gold *= durability;
    if (goldType) {
      gold = idiv(gold, 3);
      gold = idiv(gold, 10) * 10;
    }
    return gold;
  } else if (value > 0) {
    gold = idiv(value * value * 10, 12);
  } else if (
    (group === ItemGroup.Wing &&
      index > 2 &&
      !isThirdWing(def) &&
      !isCapeOfFighter(def)) ||
    group === ItemGroup.Helper ||
    group === ItemGroup.Etc
  ) {
    // Second wings, orbs, rings / pendants, scrolls: 100 + Level2³.
    gold = 100 + level2 * level2 * level2;
  } else {
    level2 += LEVEL_BONUS[Math.min(level, 15)];

    if (isFirstWing(def) || isCapeOfLord(def) || isThirdWing(def)) {
      gold = 40000000 + (40 + level2) * level2 * level2 * 11;
    } else {
      gold = 100 + idiv((40 + level2) * level2 * level2, 8);
    }

    if (group <= ItemGroup.Shield && !def.twoHand) {
      gold = idiv(gold * 80, 100);
    }

    // The `Special[]` list: skill, +option, luck, excellent options.
    if (item.hasSkill) gold += Math.trunc(gold * 1.5);

    const option = item.optionLevel ?? 0;
    if (option > 0) {
      // Shields carry AT_IMPROVE_BLOCKING (5 per step) which lands on the
      // same tiers as the +4 options of everything else.
      gold += Math.trunc(gold * optionMultiplier(Math.min(option, 4) * 4));
    }

    if (item.luck) gold += Math.trunc((gold * 25) / 100);

    for (let i = countBits(item.excellentFlags ?? 0); i > 0; i--) {
      gold += gold;
    }
  }

  gold = Math.min(gold, 3000000000);

  if (goldType === 2) gold = roundGold(gold);
  if (goldType) gold = idiv(gold, 3);

  // Selling a worn item pays less: the repair share comes off (goldType 1).
  if (goldType === 1 && hasDurability(def)) {
    const max = calcMaxDurability(
      def,
      level,
      item.isExcellent === true,
      item.isAncient === true
    );
    if (max > 0) {
      // No durability byte (offline test items): treat as undamaged.
      const percent = 1 - (item.durability ?? max) / max;
      let repairGold = Math.trunc(gold * 0.6 * percent);
      if (group === ItemGroup.Helper && index === 31) repairGold = 0;
      gold -= repairGold;
    }
  }

  return roundGold(gold);
}

/** Weapons, armour, shields and wings wear out; the rest is exempt. */
function hasDurability(def: ItemDef): boolean {
  if (def.group <= ItemGroup.Boots) return true;
  if (def.group === ItemGroup.Wing) return def.index <= 6 || isThirdWing(def) || isCapeOfFighter(def);
  if (isCapeOfLord(def)) return true;
  return false;
}

/** `CalcRepairCost`; `selfRepair` is the +150% inventory-button rate. */
export function repairCost(item: Item, selfRepair: boolean): number {
  const def = itemDef(item.group, item.num);
  if (!def) return 0;

  const max = calcMaxDurability(
    def,
    item.lvl ?? 0,
    item.isExcellent === true,
    item.isAncient === true
  );
  const durability = item.durability ?? max;

  let gold = Math.min(itemValue(item, 2), 400000000);

  const percent = max > 0 ? 1 - durability / max : 0;
  if (percent > 0) {
    const root = Math.sqrt(gold);
    const rootRoot = Math.sqrt(root);
    gold = Math.trunc(3.5 * root * rootRoot * percent) + 1;

    if (durability <= 0) {
      const isPet = def.group === ItemGroup.Helper && (def.index === 4 || def.index === 5);
      gold = isPet ? gold * 2 : Math.trunc(gold * 1.4);
    }
  } else {
    gold = 0;
  }

  if (selfRepair) gold = Math.trunc(gold * 2.5);

  return roundGold(gold);
}

/** `IsSellingBan`: what the merchant refuses. */
export function isSellingBanned(item: Item): boolean {
  const { group, num: index } = item;
  const level = item.lvl ?? 0;

  if (group === ItemGroup.Potion && index === 11) return true; // Box of Luck
  if (group === ItemGroup.Potion && index === 21 && level === 1) return true;
  if (group === ItemGroup.Potion && index === 20 && level >= 1 && level <= 5) return true;
  if (group === ItemGroup.Helper && index === 20 && level !== 0) return true; // Wizard's Ring +1/+2
  if (group === ItemGroup.Helper && index === 19) return true; // Weapon of Archangel
  if (group === ItemGroup.Helper && (index === 4 || index === 5)) return true; // Dark Horse / Raven

  return false;
}

/** `IsRepairBan`: what no smith will touch. */
export function isRepairBanned(item: Item): boolean {
  const def = itemDef(item.group, item.num);
  if (!def) return true;

  const { group, index } = def;

  if (group >= ItemGroup.Potion) return true;
  if (group === ItemGroup.Bow && (index === 7 || index === 15)) return true; // bolts / arrows
  if (group === ItemGroup.Wing) return !hasDurability(def); // orbs, chaos
  if (group === ItemGroup.Helper) {
    if (index <= 3) return true; // guardian angel .. Dinorant
    if (index === 4 || index === 5) return true; // Dark Horse / Raven
    if (index === 7) return true; // contract
    if (index === 10) return true; // Transformation Ring
    if (index === 11) return true; // Life Stone
    if (index >= 14 && index <= 19) return true; // Loch's Feather .. Weapon of Archangel
    if (index === 38) return true; // Moonstone Pendant
    return !hasDurability(def) && !(index >= 8 && index <= 13) && !(index >= 20 && index <= 28);
  }

  return false;
}

/** Items with durability below their maximum (`RepairAllGold`). */
export function needsRepair(item: Item): boolean {
  const def = itemDef(item.group, item.num);
  if (!def) return false;
  if (isRepairBanned(item)) return false;

  const max = calcMaxDurability(
    def,
    item.lvl ?? 0,
    item.isExcellent === true,
    item.isAncient === true
  );
  return (item.durability ?? max) < max;
}

/** `RepairAllGold`: the smith's price for everything worn in the inventory. */
export function repairAllCost(items: (Item | null)[], selfRepair: boolean): number {
  let total = 0;
  for (const item of items) {
    if (!item || !needsRepair(item)) continue;
    total += repairCost(item, selfRepair);
  }
  return total;
}

/** `ConvertTaxGold`: the shop's price with the merchant's tax on top. */
export function withTax(gold: number, taxRate: number): number {
  return gold + idiv(gold * taxRate, 100);
}
