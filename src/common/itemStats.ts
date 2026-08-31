import type { Item } from '../ecs/world';
import { ItemsDatabase } from './itemsDatabase';
import { learnableSkillNumber } from './skillItems';
import { skillDefinition } from './skillsDatabase';

/**
 * Item stats as the original client computes them for the tooltip and the
 * equip checks: `ZzzInfomation.cpp` `CalcDamageMin/Max`, `CalcMagicPower`,
 * `CalcSuccessfulBlocking`, `CalcDefense`, `CalcRequirements` and
 * `ZzzInventory.cpp` `CalcMaxDurability`, on top of a normalised view of
 * `items.json` (whose column names differ per group: `Strength`/`Str`,
 * `Durability`/`Dur`, `RequiredLvl`/`ReqLvl`, …).
 */

export const ItemGroup = {
  Sword: 0,
  Axe: 1,
  Mace: 2,
  Spear: 3,
  Bow: 4,
  Staff: 5,
  Shield: 6,
  Helm: 7,
  Armor: 8,
  Pants: 9,
  Gloves: 10,
  Boots: 11,
  Wing: 12,
  Helper: 13,
  Potion: 14,
  Etc: 15,
} as const;

/** Base-class index used by `RequireClass[]`: DW, DK, Elf, MG, DL, Summoner. */
export const CLASS_COLUMNS = [
  'DW/SM',
  'DK/BK',
  'Elf/ME',
  'MG',
  'DL',
  'SUM',
] as const;

export type ItemDef = {
  group: number;
  index: number;
  name: string;
  slot: number;
  width: number;
  height: number;
  /** `ITEM_ATTRIBUTE::Level` — the drop level every formula scales from. */
  level: number;
  damageMin: number;
  damageMax: number;
  magicPower: number;
  /** `WeaponSpeed`. */
  speed: number;
  durability: number;
  magicDur: number;
  defense: number;
  /** `SuccessfulBlocking` (`DefRate`). */
  blocking: number;
  reqLvl: number;
  reqStr: number;
  reqAgi: number;
  reqEne: number;
  reqVit: number;
  reqCmd: number;
  skill: number;
  /** 0 = cannot, 1 = base class, 2 = second class, 3 = third class. */
  classes: number[];
  /** Ice, Poison, Lightning, Fire, Earth, Wind, Water (helper group only). */
  resistances: number[];
  twoHand: boolean;
  modelFolder: string;
  modelName: string;
};

const defCache = new Map<string, ItemDef | null>();

function num(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number') return value;
  }
  return 0;
}

/** Normalised `items.json` row, or null for an unknown item. */
export function itemDef(group: number, index: number): ItemDef | null {
  const key = `${group}:${index}`;
  const cached = defCache.get(key);
  if (cached !== undefined) return cached;

  const raw = ItemsDatabase.getItem(group, index) as
    | Record<string, unknown>
    | null;
  if (!raw) {
    defCache.set(key, null);
    return null;
  }

  const width = num(raw, 'X') || 1;
  const def: ItemDef = {
    group,
    index,
    name: String(raw.ItemName ?? ''),
    slot: typeof raw.ItemSlot === 'number' ? raw.ItemSlot : -1,
    width,
    height: num(raw, 'Y') || 1,
    level: num(raw, 'ItemLvl', 'Lvl'),
    damageMin: num(raw, 'DmgMin'),
    damageMax: num(raw, 'DmgMax'),
    magicPower: num(raw, 'MagicPwr'),
    speed: num(raw, 'Speed'),
    durability: num(raw, 'Durability', 'Dur'),
    magicDur: num(raw, 'MagicDur'),
    defense: num(raw, 'Def'),
    blocking: num(raw, 'DefRate'),
    reqLvl: num(raw, 'RequiredLvl', 'ReqLvl'),
    reqStr: num(raw, 'Strength', 'Str'),
    reqAgi: num(raw, 'Agi'),
    reqEne: num(raw, 'Ene', 'Energy'),
    reqVit: num(raw, 'Vit'),
    reqCmd: num(raw, 'Command', 'Comm'),
    skill: num(raw, 'Skill'),
    classes: CLASS_COLUMNS.map(column => num(raw, column)),
    resistances: [
      'Ice',
      'Poison',
      'Light',
      'Fire',
      'Earth',
      'Wind',
      'Water',
    ].map(column => num(raw, column)),
    // Item.bmd's TwoHand flag is not in Item.txt; every two-handed weapon
    // in the table is two squares wide and no one-hander is.
    twoHand: group <= ItemGroup.Staff && width >= 2,
    modelFolder: String(raw.szModelFolder ?? ''),
    modelName: String(raw.szModelName ?? ''),
  };

  defCache.set(key, def);
  return def;
}

// --- item-kind predicates (ZzzInfomation.cpp / _define.h ranges) ------------

export function isWeapon(def: ItemDef): boolean {
  return def.group <= ItemGroup.Staff;
}

export function isArmorPart(def: ItemDef): boolean {
  return def.group >= ItemGroup.Helm && def.group <= ItemGroup.Boots;
}

export function isShield(def: ItemDef): boolean {
  return def.group === ItemGroup.Shield;
}

export function isStaff(def: ItemDef): boolean {
  return def.group === ItemGroup.Staff;
}

/** Summoner books (Book of Samut… = MODEL_BOOK_OF_SAHAMUTT..STAFF+29). */
export function isSummonerBook(def: ItemDef): boolean {
  return def.group === ItemGroup.Staff && def.index >= 21 && def.index <= 29;
}

/** `IsCepterItem`: Dark Lord scepters (mace 8…18, Frost Mace excluded). */
export function isScepter(def: ItemDef): boolean {
  return def.group === ItemGroup.Mace && def.index >= 8 && def.index !== 16;
}

/** Fairy / Heaven / Satan wings (ITEM_WING..ITEM_WINGS_OF_SATAN) + Wing of Curse. */
export function isFirstWing(def: ItemDef): boolean {
  return (
    def.group === ItemGroup.Wing &&
    (def.index <= 2 || def.index === 41 || def.index === 42)
  );
}

/** Spirits / Soul / Dragon / Darkness wings + Wings of Despair. */
export function isSecondWing(def: ItemDef): boolean {
  return (
    def.group === ItemGroup.Wing &&
    ((def.index >= 3 && def.index <= 6) || def.index === 41)
  );
}

/** Storm / Eternal / Illusion / Ruin / Cape of Emperor / Wing of Dimension / Cape of Overrule. */
export function isThirdWing(def: ItemDef): boolean {
  return (
    def.group === ItemGroup.Wing &&
    ((def.index >= 36 && def.index <= 40) ||
      def.index === 43 ||
      def.index === 50)
  );
}

export function isCapeOfLord(def: ItemDef): boolean {
  return def.group === ItemGroup.Helper && def.index === 30;
}

export function isCapeOfFighter(def: ItemDef): boolean {
  return def.group === ItemGroup.Wing && def.index === 49;
}

export function isWing(def: ItemDef): boolean {
  return (
    isFirstWing(def) ||
    isSecondWing(def) ||
    isThirdWing(def) ||
    isCapeOfLord(def) ||
    isCapeOfFighter(def)
  );
}

export function isRing(def: ItemDef): boolean {
  return (
    def.group === ItemGroup.Helper &&
    ((def.index >= 8 && def.index <= 12) || (def.index >= 20 && def.index <= 24))
  );
}

export function isPendant(def: ItemDef): boolean {
  return (
    def.group === ItemGroup.Helper &&
    ((def.index >= 12 && def.index <= 13) || (def.index >= 25 && def.index <= 28))
  );
}

export function isJewel(def: ItemDef): boolean {
  if (def.group === ItemGroup.Wing && def.index === 15) return true; // Chaos
  if (def.group !== ItemGroup.Potion) return false;
  return [13, 14, 16, 22, 31, 41, 42, 43, 44].includes(def.index);
}

// --- stat formulas -----------------------------------------------------------

const idiv = (a: number, b: number) => Math.trunc(a / b);

export type ItemStats = {
  def: ItemDef;
  level: number;
  isExcellent: boolean;
  isAncient: boolean;
  damageMin: number;
  damageMax: number;
  magicPower: number;
  blocking: number;
  defense: number;
  reqLvl: number;
  reqStr: number;
  reqAgi: number;
  reqVit: number;
  reqEne: number;
  reqCmd: number;
  maxDurability: number;
};

function dropLevel(def: ItemDef): number {
  return def.level + 30;
}

/** `GetExcellentAddValue`: the three chaos weapons use a fixed bonus. */
function excellentAddValue(def: ItemDef): number {
  if (def.group === ItemGroup.Mace && def.index === 6) return 15; // Chaos Dragon Axe
  if (def.group === ItemGroup.Bow && def.index === 6) return 30; // Chaos Nature Bow
  if (def.group === ItemGroup.Staff && def.index === 7) return 25; // Chaos Lightning Staff
  return 0;
}

function calcDamage(
  base: number,
  def: ItemDef,
  level: number,
  isExcellent: boolean,
  isAncient: boolean
): number {
  if (base <= 0) return 0;
  let value = base;

  if (isExcellent && def.level) {
    const add = excellentAddValue(def);
    value += add ? add : idiv(base * 25, def.level) + 5;
  }
  if (isAncient) value += 5 + idiv(dropLevel(def), 40);

  value += Math.min(9, level) * 3;
  if (level - 9 > 0) value += level - 6;

  return value;
}

function calcMagicPower(
  def: ItemDef,
  level: number,
  isExcellent: boolean,
  isAncient: boolean
): number {
  if (def.magicPower <= 0) return 0;
  let value = def.magicPower;

  if (isExcellent && def.level) {
    const add = excellentAddValue(def);
    value += add ? add : idiv(def.magicPower * 25, def.level) + 5;
  }
  if (isAncient) value += 2 + idiv(dropLevel(def), 60);

  value += Math.min(9, level) * 3;
  if (level - 9 > 0) value += level - 6;

  value = idiv(value, 2);
  if (!isScepter(def)) value += level * 2;

  return value;
}

/** Note: the original scales this from the *drop* level, not the item's +N. */
function calcBlocking(def: ItemDef, isExcellent: boolean): number {
  if (def.blocking === 0) return 0;
  let value = def.blocking;

  if (isExcellent && def.level) {
    value += idiv(def.blocking * 25, def.level) + 5;
  }
  value += Math.min(9, def.level) * 3;
  if (def.level - 9 > 0) value += def.level - 6;

  return value;
}

function calcDefense(
  def: ItemDef,
  level: number,
  isExcellent: boolean,
  isAncient: boolean
): number {
  let base = def.defense;
  if (isCapeOfLord(def)) base = 15;
  if (base === 0) return 0;

  let value = base;
  const drop = dropLevel(def);

  if (isShield(def)) {
    value += level;
    if (isAncient) value = value + (idiv(value * 20, drop) + 2);
    return value;
  }

  if (isExcellent && def.level > 0) {
    value += idiv(base * 12, def.level) + 4 + idiv(def.level, 5);
  }
  if (isAncient) {
    value += base + (idiv(value * 3, drop) + 2 + idiv(drop, 30));
  }

  if (isSecondWing(def)) {
    value += Math.min(9, level) * 2;
  } else if (isCapeOfLord(def) || isCapeOfFighter(def)) {
    value += Math.min(9, level) * 2;
  } else if (isThirdWing(def)) {
    value += Math.min(9, level) * 4;
  } else {
    value += Math.min(9, level) * 3;
  }

  if (level - 9 > 0) {
    value += isThirdWing(def) ? level - 5 : level - 6;
  }

  return value;
}

/** `CalcMaxDurability` (ZzzInventory.cpp:1549). */
export function calcMaxDurability(
  def: ItemDef,
  level: number,
  isExcellent: boolean,
  isAncient: boolean
): number {
  let max = isStaff(def) ? def.magicDur : def.durability;

  for (let i = 0; i < level; i++) {
    // Scroll of Blood and later etc items do not gain durability.
    if (def.group === ItemGroup.Etc && def.index >= 21) break;
    if (i >= 14) max = Math.min(255, max + 8);
    else if (i >= 13) max = Math.min(255, max + 7);
    else if (i >= 12) max += 6;
    else if (i >= 11) max += 5;
    else if (i >= 10) max += 4;
    else if (i >= 9) max += 3;
    else if (i >= 4) max += 2;
    else max += 1;
  }

  // Dark Horse / Dark Raven
  if (def.group === ItemGroup.Helper && (def.index === 4 || def.index === 5)) {
    max = 255;
  }

  if (isAncient) {
    max += 20;
  } else if (isExcellent && !isWing(def)) {
    max += 15;
  }

  return max;
}

function calcRequirements(
  def: ItemDef,
  level: number,
  isExcellent: boolean,
  isAncient: boolean
) {
  let itemLevel = def.level;
  if (isExcellent) itemLevel = def.level + 25;
  else if (isAncient) itemLevel = def.level + 30;

  const addValue = isSecondWing(def) ? 5 : 4;

  let reqLvl = 0;
  if (def.reqLvl) {
    // Gear keeps its table level; wings, helpers and consumables climb
    // `addValue` per +1.
    const scalesWithLevel =
      isFirstWing(def) ||
      isSecondWing(def) ||
      isCapeOfFighter(def) ||
      def.group >= ItemGroup.Helper;
    reqLvl = scalesWithLevel ? def.reqLvl + level * addValue : def.reqLvl;
  }

  const scaled = (req: number, mul: number) =>
    req ? 20 + idiv(req * (itemLevel + level * 3) * mul, 100) : 0;

  const reqStr = scaled(def.reqStr, 3);
  const reqAgi = scaled(def.reqAgi, 3);
  const reqVit = scaled(def.reqVit, 3);

  let reqEne = 0;
  if (def.reqEne) {
    if (isSummonerBook(def)) {
      reqEne = 20 + idiv(def.reqEne * (itemLevel + level) * 3, 100);
    } else if (def.reqLvl > 0 && def.group === ItemGroup.Etc) {
      reqEne = 20 + idiv(def.reqEne * def.reqLvl * 4, 100);
    } else {
      reqEne = scaled(def.reqEne, 4);
    }
  }

  // Orb of Summoning: fixed energy per level.
  if (def.group === ItemGroup.Wing && def.index === 11) {
    reqEne = [30, 60, 90, 130, 170, 210, 300, 500][Math.min(level, 7)];
  }

  let reqCmd = 0;
  if (def.reqCmd) {
    // Dark Raven scales, everything else reads the table value straight.
    reqCmd =
      def.group === ItemGroup.Helper && def.index === 5
        ? 185 + def.reqCmd * 15
        : def.reqCmd;
  }

  // Transformation Ring
  if (def.group === ItemGroup.Helper && def.index === 10) {
    reqLvl = level <= 2 ? 20 : 50;
  }

  // Orbs and scrolls: Item.txt has no level / energy column for most of
  // them - the skill they teach carries the numbers OpenMU checks on use
  // (`Scrolls.cs` / `Orbs.cs` seed the item requirements from the skill).
  const taught = learnableSkillNumber(def.group, def.index, level);
  const skill = taught === undefined ? undefined : skillDefinition(taught);
  if (skill) {
    reqLvl = Math.max(reqLvl, skill.level);
    reqEne = Math.max(reqEne, skill.energy);
  }

  return { reqLvl, reqStr, reqAgi, reqVit, reqEne, reqCmd };
}

const statsCache = new Map<string, ItemStats | null>();

/** The item's effective stats for its level / excellent / ancient state. */
export function itemStats(item: Item): ItemStats | null {
  const level = Math.max(0, Math.min(15, item.lvl ?? 0));
  const isExcellent = item.isExcellent === true;
  const isAncient = item.isAncient === true;

  const key = `${item.group}:${item.num}|${level}|${isExcellent ? 1 : 0}|${
    isAncient ? 1 : 0
  }`;
  const cached = statsCache.get(key);
  if (cached !== undefined) return cached;

  const def = itemDef(item.group, item.num);
  if (!def) {
    statsCache.set(key, null);
    return null;
  }

  const stats: ItemStats = {
    def,
    level,
    isExcellent,
    isAncient,
    damageMin: calcDamage(def.damageMin, def, level, isExcellent, isAncient),
    damageMax: calcDamage(def.damageMax, def, level, isExcellent, isAncient),
    magicPower: calcMagicPower(def, level, isExcellent, isAncient),
    blocking: calcBlocking(def, isExcellent),
    defense: calcDefense(def, level, isExcellent, isAncient),
    ...calcRequirements(def, level, isExcellent, isAncient),
    maxDurability: calcMaxDurability(def, level, isExcellent, isAncient),
  };

  statsCache.set(key, stats);
  return stats;
}

// --- the hero ---------------------------------------------------------------

export type HeroStats = {
  level: number;
  str: number;
  agi: number;
  vit: number;
  ene: number;
  cmd: number;
  /** Base class column (CLASS_COLUMNS index). */
  baseClass: number;
  /** 1 = first, 2 = second (quest), 3 = third (master) class. */
  stepClass: number;
};

/**
 * `CCharacterManager::GetBaseClass` / `GetStepClass` for the wire class
 * numbers (DW 0, SM 2, GM 3, DK 4, BK 6, BM 7, FE 8, ME 10, HE 11, MG 12,
 * DM 13, DL 16, LE 17, SUM 20, BS 22, DiM 23, RF 24, FM 25). MG and DL count
 * as second-class from the start, as in the original's `IsSecondClass`.
 */
export function classOf(charClass: number): { base: number; step: number } {
  switch (charClass) {
    case 0:
      return { base: 0, step: 1 };
    case 2:
      return { base: 0, step: 2 };
    case 3:
      return { base: 0, step: 3 };
    case 4:
      return { base: 1, step: 1 };
    case 6:
      return { base: 1, step: 2 };
    case 7:
      return { base: 1, step: 3 };
    case 8:
      return { base: 2, step: 1 };
    case 10:
      return { base: 2, step: 2 };
    case 11:
      return { base: 2, step: 3 };
    case 12:
      return { base: 3, step: 2 };
    case 13:
      return { base: 3, step: 3 };
    case 16:
      return { base: 4, step: 2 };
    case 17:
      return { base: 4, step: 3 };
    case 20:
      return { base: 5, step: 1 };
    case 22:
      return { base: 5, step: 2 };
    case 23:
      return { base: 5, step: 3 };
    default:
      // Rage Fighter has no column in this Item.txt; nothing class-gated fits.
      return { base: -1, step: 1 };
  }
}

/** `RequireClass`: the item's class entry for the hero is set and at or below the hero's step. */
export function classCanUse(def: ItemDef, hero: HeroStats): boolean {
  if (def.classes.every(value => value === 1)) return true;
  if (hero.baseClass < 0) return false;
  const required = def.classes[hero.baseClass] ?? 0;
  return required !== 0 && required <= hero.stepClass;
}

