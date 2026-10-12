import { t, type TextKey } from '../../i18n';
import { BaseClass, CharacterClassNumber, getBaseClass } from '../../core/types';
import { ItemsDatabase } from '@versions/shared/items/itemsDatabase';
import { InventoryConstants } from '@/core/inventoryConstants';
import type { Item } from '../../ecs/world';
import { activeSetOptions, classCanUse, wornStatBonus, classOf, harmonyBonus, harmonyNeedCut, hasGuardianOption, itemDef, periodExpired, itemStats, optionSpecials, socketStatusBonus, type OptionSpecial, type SetOptionLine, type SocketStatusBonus } from '@/controllers/item_rules';
import type { ItemOptionTables, ItemSetTables } from '@/controllers/assets';

export enum StatType {
  Strength = 0,
  Agility = 1,
  Vitality = 2,
  Energy = 3,
  Leadership = 4,
}

// The base class lives in core so the actors controller can read it too.
export { BaseClass, getBaseClass };

/** Wire class number -> catalogue key; `getClassName` prints `t()` of it. */
const CLASS_NAME_KEYS: Partial<Record<CharacterClassNumber, TextKey>> = {
  [CharacterClassNumber.DarkWizard]: 'class.darkWizard',
  [CharacterClassNumber.SoulMaster]: 'class.soulMaster',
  [CharacterClassNumber.GrandMaster]: 'class.grandMaster',
  [CharacterClassNumber.DarkKnight]: 'class.darkKnight',
  [CharacterClassNumber.BladeKnight]: 'class.bladeKnight',
  [CharacterClassNumber.BladeMaster]: 'class.bladeMaster',
  [CharacterClassNumber.FairyElf]: 'class.elf',
  [CharacterClassNumber.MuseElf]: 'class.museElf',
  [CharacterClassNumber.HighElf]: 'class.highElf',
  [CharacterClassNumber.MagicGladiator]: 'class.magicGladiator',
  [CharacterClassNumber.DuelMaster]: 'class.duelMaster',
  [CharacterClassNumber.DarkLord]: 'class.darkLord',
  [CharacterClassNumber.LordEmperor]: 'class.lordEmperor',
  [CharacterClassNumber.Summoner]: 'class.summoner',
  [CharacterClassNumber.BloodySummoner]: 'class.bloodySummoner',
  [CharacterClassNumber.DimensionMaster]: 'class.dimensionMaster',
  [CharacterClassNumber.RageFighter]: 'class.rageFighter',
  [CharacterClassNumber.FistMaster]: 'class.fistMaster',
};

export function getClassName(cls: CharacterClassNumber): string {
  return t(CLASS_NAME_KEYS[cls] ?? 'class.darkWizard');
}

const STAT_NAME_KEYS: Record<StatType, TextKey> = {
  [StatType.Strength]: 'stat.strength',
  [StatType.Agility]: 'stat.agility',
  [StatType.Vitality]: 'stat.vitality',
  [StatType.Energy]: 'stat.energy',
  [StatType.Leadership]: 'stat.command',
};

export function getStatName(stat: StatType): string {
  return t(STAT_NAME_KEYS[stat]);
}

type ItemConfig = Record<string, unknown>;

function configOf(item: Item): ItemConfig | null {
  return ItemsDatabase.getItem(item.group, item.num) as ItemConfig | null;
}

function field(config: ItemConfig, ...names: string[]): number {
  for (const name of names) {
    const value = config[name];
    if (typeof value === 'number') return value;
  }
  return 0;
}

function firstSet(config: ItemConfig, ...names: string[]): number {
  for (const name of names) {
    const value = config[name];
    if (typeof value === 'number' && value !== 0) return value;
  }
  return 0;
}

const GROUP_SWORD = 0;
const GROUP_MACE = 2;
const GROUP_BOW = 4;
const GROUP_STAFF = 5;
const GROUP_SHIELD = 6;
const GROUP_BOOTS = 11;
const GROUP_WING = 12;
const GROUP_HELPER = 13;

/** ITEM_BOLT and ITEM_ARROWS, ITEM_BOW + 7 and + 15 (_enum.h:2268, :2276). */
const BOLT = 7;
const ARROWS = 15;

/** `IsGeneralBowItem` and `IsGeneralCrossbowItem` (CharacterManager.cpp:84-96, _enum.h:2261-2285). */
function isBow(item: Item): boolean {
  return item.group === GROUP_BOW && (item.num <= 6 || item.num === 17 || (item.num >= 20 && item.num <= 24));
}

function isCrossbow(item: Item): boolean {
  return item.group === GROUP_BOW && ((item.num >= 8 && item.num <= 14) || item.num === 16 || item.num === 18 || item.num === 19);
}

function isShield(item: Item): boolean {
  return item.group === GROUP_SHIELD;
}

function isStaff(item: Item): boolean {
  return item.group === GROUP_STAFF;
}

function itemDamage(item: Item): { min: number; max: number } {
  const config = configOf(item);
  if (!config) return { min: 0, max: 0 };

  const dropLevel = field(config, 'ItemLvl');
  const level = item.lvl ?? 0;

  const withBonuses = (base: number) => {
    if (base <= 0) return 0;

    let value = base;

    if (item.isExcellent && dropLevel > 0) {
      value += Math.trunc((base * 25) / dropLevel) + 5;
    }

    value += Math.min(9, level) * 3;
    if (level > 9) value += level - 6;

    return value;
  };

  return {
    min: withBonuses(field(config, 'DmgMin')),
    max: withBonuses(field(config, 'DmgMax')),
  };
}

function itemDefense(item: Item): number {
  const config = configOf(item);
  if (!config) return 0;

  const base = firstSet(config, 'Def', 'DefRate');
  if (base <= 0) return 0;

  const level = item.lvl ?? 0;
  let defense = base;

  if (isShield(item)) {
    return defense + level;
  }

  const dropLevel = field(config, 'ItemLvl');
  if (item.isExcellent && dropLevel > 0) {
    defense +=
      Math.trunc((base * 12) / dropLevel) + 4 + Math.trunc(dropLevel / 5);
  }

  return defense + Math.min(9, level) * defensePerLevel(item);
}

function defensePerLevel(item: Item): number {
  if (item.group === GROUP_WING) {
    if (item.num >= 3 && item.num <= 6) return 2;
    if (item.num === 42) return 2;
    if (item.num === 49 || item.num === 50) return 2;
    if ((item.num >= 36 && item.num <= 40) || item.num === 43) return 4;
  }

  if (item.group === GROUP_HELPER && item.num === 30) return 2;

  return 3;
}

function itemBlocking(item: Item): number {
  const config = configOf(item);
  if (!config) return 0;

  const base = field(config, 'DefRate');
  if (base <= 0) return 0;

  const dropLevel = field(config, 'ItemLvl');

  let blocking = base;
  if (item.isExcellent && dropLevel > 0) {
    blocking += Math.trunc((base * 25) / dropLevel) + 5;
  }

  blocking += Math.min(9, dropLevel) * 3;
  if (dropLevel > 9) blocking += dropLevel - 6;

  return blocking;
}

/**
 * `CalcDurabilityPercent` (ZzzInfomation.cpp:2440-2485): how much of a stat a worn item loses; a wing passes no
 * excellent bits, the window's magic rate reads `MagicDur`.
 */
function durabilityPercent(item: Item, wing = false, magic = false): number {
  const config = configOf(item);
  if (!config || item.durability === undefined) return 0;
  const level = item.lvl ?? 0;
  let max = (magic ? field(config, 'MagicDur') : firstSet(config, 'Dur', 'Durability')) + Math.min(level, 4) + Math.max(0, level - 4) * 2;
  if (!wing && (item.ancientDiscriminator ?? 0) > 0) max += 20;
  else if (!wing && (item.excellentFlags ?? 0) & 63) max += 15;
  const worn = 1 - item.durability / max;
  return worn > 0.8 ? 0.5 : worn > 0.7 ? 0.3 : worn > 0.5 ? 0.2 : 0;
}

function itemMagicPower(item: Item): number {
  const config = configOf(item);
  if (!config) return 0;

  const base = field(config, 'MagicPwr');
  if (base <= 0) return 0;

  const level = item.lvl ?? 0;
  const dropLevel = field(config, 'ItemLvl');

  let power = base;

  if (item.isExcellent && dropLevel > 0) {
    power += Math.trunc((base * 25) / dropLevel) + 5;
  }

  power += Math.min(9, level) * 3;
  if (level > 9) power += level - 6;

  power = Math.trunc(power / 2);

  if (item.group !== GROUP_MACE) power += level * 2;

  return power;
}

type CharacterStatsInput = {
  charClass: CharacterClassNumber;
  level: number;
  strength: number;
  agility: number;
  vitality: number;
  energy: number;
  leadership: number;
  items: (Item | null)[];
  /** The ancient set and socket tables; without them no set or socket bonus is added. */
  sets?: ItemSetTables | null;
  options?: ItemOptionTables | null;
  /** What a socket value per level, life or mana reads. */
  masterLevel?: number;
  maxLife?: number;
  maxMana?: number;
  /** The selected skill (`Hero->CurrentSkill`) and its `SkillAttribute` Damage, for the wizardry line. */
  magicSkill?: { number: number; damage: number } | null;
  /** The hero's buff ids (`eBuffState`). */
  buffs?: readonly number[];
  /** The item on the cursor and the equipment slot it was lifted from (`PickItem`, `SrcInventoryIndex`). */
  picked?: { slot: number; item: Item } | null;
};

/** eBuff_Hp_up_Ourforces and eBuff_Def_up_Ourforces (_enum.h:4019-4020). */
const HP_UP_OURFORCES = 130;
const DEF_UP_OURFORCES = 131;

/** `CalculateBasicState`'s party buff vitality (ZzzInfomation.cpp:3492-3503): 30 + (Energy - 132) / 10 from 132 energy, at most 200. */
function buffVitality(input: CharacterStatsInput): number {
  if (!input.buffs?.includes(HP_UP_OURFORCES) || input.energy < 132) return 0;
  return Math.min(200, 30 + Math.trunc((input.energy - 132) / 10));
}

/** The window's party buff blocking (NewUICharacterInfoWindow.cpp:966-975): the rate times 10 + (Energy - 80) / 10 percent, at most 100. */
function buffBlocking(input: CharacterStatsInput, rate: number): number {
  if (!input.buffs?.includes(DEF_UP_OURFORCES)) return 0;
  return Math.trunc((rate * Math.min(100, Math.trunc(10 + (input.energy - 80) / 10))) / 100);
}

/**
 * Attack/magic speed per point of agility, as configured on the OpenMU
 * server (Persistence/Initialization/CharacterClasses/Class*.cs). Item
 * "+attack speed" options are not included yet (items.json has no option data).
 */
const ATTACK_SPEED_DIVISOR: Record<BaseClass, number> = {
  [BaseClass.Wizard]: 20,
  [BaseClass.Knight]: 15,
  [BaseClass.Elf]: 50,
  [BaseClass.MagicGladiator]: 15,
  [BaseClass.DarkLord]: 10,
  [BaseClass.Summoner]: 20,
  [BaseClass.RageFighter]: 9,
};

const MAGIC_SPEED_DIVISOR: Record<BaseClass, number> = {
  [BaseClass.Wizard]: 10,
  [BaseClass.Knight]: 20,
  [BaseClass.Elf]: 50,
  [BaseClass.MagicGladiator]: 20,
  [BaseClass.DarkLord]: 10,
  [BaseClass.Summoner]: 20,
  [BaseClass.RageFighter]: 9,
};

export function attackSpeedOf(cls: CharacterClassNumber, agility: number): number {
  return Math.trunc(agility / ATTACK_SPEED_DIVISOR[getBaseClass(cls)]);
}

export function magicSpeedOf(cls: CharacterClassNumber, agility: number): number {
  return Math.trunc(agility / MAGIC_SPEED_DIVISOR[getBaseClass(cls)]);
}

/** The window's attack speed line: the server's value when it sent one, MagicSpeed for the wizard and summoner (NewUICharacterInfoWindow.cpp:1039-1040). */
export function windowAttackSpeed(
  cls: CharacterClassNumber,
  stats: { attackSpeed: number; magicSpeed: number },
  server: { attack: number | null; magic: number | null }
): number {
  const base = getBaseClass(cls);
  return base === BaseClass.Wizard || base === BaseClass.Summoner ? server.magic ?? stats.magicSpeed : server.attack ?? stats.attackSpeed;
}

type DerivedStats = {
  attackSpeed: number;
  magicSpeed: number;
  damageMin: number;
  damageMax: number;
  attackRate: number;
  attackRatePvp: number;
  /** The PvP attack rate's "(+N)": harmony attack rate and the 380 attack. */
  attackRatePvpBonus: number;
  defense: number;
  /** The harmony defense inside `defense`, which the full set's "(+N)" leaves out. */
  harmonyDefense: number;
  defenseRate: number;
  defenseRatePvp: number;
  /** The PvP defense rate's "(+N)": harmony defense rate and the 380 defense. */
  defenseRatePvpBonus: number;
  /** The defense buff's share of the rate, the defense line's "+N" (0 without the buff). */
  blockingBuff: number;
  /** `GetAttackDamage`'s return: the damage line prints blue (NewUICharacterInfoWindow.cpp:765). */
  damageBlue: boolean;
  /** The detail line the worn pet prints magenta, null for none. */
  petEvent: 'attackSpeed' | 'hp' | null;
  wizardryMin: number;
  wizardryMax: number;
  /** Null without a staff or a magic sword in the right hand; "(+0)" still prints with one (:1336-1353). */
  staffRate: number | null;
  curseMin: number;
  curseMax: number;
  /** Null without a book in the left hand: the line then has no "(+N)". */
  curseRate: number | null;
  /** Strength + AddStrength and the rest: what the window's skill damage lines read. */
  totals: { str: number; agi: number; vit: number; ene: number; cmd: number };
  /** AddStrength and the rest: a row prints in blue while its stat has some (NewUICharacterInfoWindow.cpp:463-475). */
  added: { str: number; agi: number; vit: number; ene: number; cmd: number };
};

function equipped(items: (Item | null)[], slot: number): Item | null {
  return items[slot] ?? null;
}

function calculateDamage(
  input: CharacterStatsInput,
  base: BaseClass,
  flat: { set: Range; socket: Range }
): { min: number; max: number; blue: boolean } {
  const { strength, agility, energy, vitality, items } = input;

  const weaponRight = equipped(items, InventoryConstants.LeftHandSlot);
  const weaponLeft = equipped(items, InventoryConstants.RightHandSlot);

  let statMin = 0;
  let statMax = 0;

  // A broken bow keeps the class formula (ZzzInfomation.cpp:2557).
  const usingBow =
    (!!weaponLeft && isBow(weaponLeft) && weaponLeft.durability !== 0) ||
    (!!weaponRight && isCrossbow(weaponRight) && weaponRight.durability !== 0);

  if (usingBow) {
    statMin = Math.trunc(agility / 7) + Math.trunc(strength / 14);
    statMax = Math.trunc(agility / 4) + Math.trunc(strength / 8);
  } else {
    switch (base) {
      case BaseClass.Elf:
      case BaseClass.Summoner:
        statMin = Math.trunc((strength + agility) / 7);
        statMax = Math.trunc((strength + agility) / 4);
        break;

      case BaseClass.Knight:
        statMin = Math.trunc(strength / 6);
        statMax = Math.trunc(strength / 4);
        break;

      case BaseClass.MagicGladiator:
        statMin = Math.trunc(strength / 6) + Math.trunc(energy / 12);
        statMax = Math.trunc(strength / 4) + Math.trunc(energy / 9);
        break;

      case BaseClass.DarkLord:
        statMin = Math.trunc(strength / 7) + Math.trunc(energy / 14);
        statMax = Math.trunc(strength / 5) + Math.trunc(energy / 10);
        break;

      case BaseClass.RageFighter:
        statMin = Math.trunc(strength / 7) + Math.trunc(vitality / 15);
        statMax = Math.trunc(strength / 5) + Math.trunc(vitality / 12);
        break;

      default:
        statMin = Math.trunc(strength / 8);
        statMax = Math.trunc(strength / 4);
        break;
    }
  }

  const right = { min: statMin, max: statMax };
  const left = { min: statMin, max: statMax };
  const add = (hand: Range, value: number) => {
    hand.min += value;
    hand.max += value;
  };
  const percent = (hand: Range, rate: number) => {
    hand.min += Math.trunc((hand.min * rate) / 100);
    hand.max += Math.trunc((hand.max * rate) / 100);
  };
  const excellent = (hand: Range, item: Item | null) => {
    const bits = excellentBits(item, input, false);
    add(hand, bits.level);
    if (bits.percent) percent(hand, bits.percent);
  };
  // A weapon's damage and option, worn by durability; a staff's goes to the left side (:2650-2711).
  const weapon = (item: Item | null, hand: Range) => {
    if (!item || item.durability === 0) return;
    const worn = durabilityPercent(item);
    const option = special(item, 'damage', input);
    const damage = itemDamage(item);
    const side = isStaff(item) ? left : hand;
    side.min += damage.min + option - Math.trunc((damage.min + option) * worn);
    side.max += damage.max + option - Math.trunc((damage.max + option) * worn);
    excellent(hand, item);
  };

  const wing = equipped(input.items, InventoryConstants.WingsSlot);
  if (wing) {
    const option = special(wing, 'damage', input);
    const worn = option - Math.trunc(option * durabilityPercent(wing, true));
    add(right, worn);
    add(left, worn);
  }
  weapon(weaponRight, right);
  weapon(weaponLeft, left);
  const amulet = equipped(input.items, InventoryConstants.PendantSlot);
  excellent(right, amulet);
  excellent(left, amulet);
  for (const slot of [InventoryConstants.Ring1Slot, InventoryConstants.Ring2Slot]) {
    const rate = ringPercent(equipped(input.items, slot), input);
    if (rate) {
      percent(right, rate);
      percent(left, rate);
    }
  }

  // The set damage reaches both hands (ZzzInfomation.cpp:2745-2767).
  right.min += flat.set.min;
  right.max += flat.set.max;
  left.min += flat.set.min;
  left.max += flat.set.max;

  // +1 or better bolts raise the crossbow, arrows the bow (:2769-2784).
  if (weaponRight?.group === GROUP_BOW && weaponLeft?.group === GROUP_BOW) {
    const share = (hand: Range, level: number) => {
      const rate = Math.fround((level * 2 + 1) * Math.fround(0.01));
      hand.min += Math.trunc(Math.fround(hand.min * rate) + 1);
      hand.max += Math.trunc(Math.fround(hand.max * rate) + 1);
    };
    if (weaponLeft.num === BOLT && (weaponLeft.lvl ?? 0) >= 1) share(right, weaponLeft.lvl ?? 0);
    else if (weaponRight.num === ARROWS && (weaponRight.lvl ?? 0) >= 1) share(left, weaponRight.lvl ?? 0);
  }

  // Then the sockets (:2809-2812).
  right.min += flat.socket.min;
  right.max += flat.socket.max;
  left.min += flat.socket.min;
  left.max += flat.socket.max;
  const { min: minRight, max: maxRight } = right;
  const { min: minLeft, max: maxLeft } = left;

  let min: number;
  let max: number;

  // GetAttackDamage reads a weapon dragged out of a hand as still held (ZzzInventory.cpp:5900-5911).
  const picked = input.picked;
  const r = picked?.slot === InventoryConstants.LeftHandSlot ? picked.item : weaponRight;
  const l = picked?.slot === InventoryConstants.RightHandSlot ? picked.item : weaponLeft;

  // GetEquipedBowType looks for the bow first (CharacterManager.cpp:286-301).
  if (!!weaponLeft && isBow(weaponLeft)) {
    min = minLeft;
    max = maxLeft;
  } else if (!!weaponRight && isCrossbow(weaponRight)) {
    min = minRight;
    max = maxRight;
  } else if (!r || isStaff(r)) {
    min = minLeft;
    max = maxLeft;
  } else {
    min = minRight;
    max = maxRight;
  }

  // GetAttackDamage's `Alpha` (ZzzInventory.cpp:5937-5966).
  let blue = false;

  if (base === BaseClass.Knight || base === BaseClass.MagicGladiator) {
    if (r && l && r.group <= GROUP_STAFF && l.group <= GROUP_STAFF) {
      blue = true;
      min = Math.trunc((minRight * 55) / 100) + Math.trunc((minLeft * 55) / 100);
      max = Math.trunc((maxRight * 55) / 100) + Math.trunc((maxLeft * 55) / 100);
    }
  } else if (base === BaseClass.Elf) {
    // A bow or crossbow with +1 or better arrows or bolts in the other hand.
    if (r?.group === GROUP_BOW && l?.group === GROUP_BOW) {
      blue = (l.num === BOLT && (l.lvl ?? 0) >= 1) || (r.num === ARROWS && (r.lvl ?? 0) >= 1);
    }
  } else if (base === BaseClass.RageFighter) {
    if (r && l && r.group <= GROUP_MACE && l.group <= GROUP_MACE) {
      blue = true;
      min = Math.trunc(((minRight + minLeft) * 60) / 100);
      max = Math.trunc(((maxRight + maxLeft) * 65) / 100);
    }
  }

  return { min, max, blue };
}

function calculateAttackRate(
  input: CharacterStatsInput,
  base: BaseClass
): number {
  const { level, strength, agility, leadership } = input;

  if (base === BaseClass.DarkLord) {
    return (
      level * 5 +
      Math.trunc((agility * 5) / 2) +
      Math.trunc(strength / 6) +
      Math.trunc(leadership / 10)
    );
  }

  if (base === BaseClass.RageFighter) {
    return level * 3 + Math.trunc((agility * 5) / 4) + Math.trunc(strength / 6);
  }

  return level * 5 + Math.trunc((agility * 3) / 2) + Math.trunc(strength / 4);
}

function calculateAttackRatePvp(
  input: CharacterStatsInput,
  base: BaseClass
): number {
  const { level, agility } = input;

  switch (base) {
    case BaseClass.Knight:
      return Math.trunc(level * 3 + agility * 4.5);
    case BaseClass.DarkLord:
    case BaseClass.Wizard:
      return Math.trunc(level * 3 + agility * 4);
    case BaseClass.Elf:
      return Math.trunc(level * 3 + agility * 0.6);
    case BaseClass.MagicGladiator:
    case BaseClass.Summoner:
      return Math.trunc(level * 3 + agility * 3.5);
    case BaseClass.RageFighter:
      return Math.trunc(level * 2.6 + agility * 3.6);
    default:
      return 0;
  }
}

function calculateDefense(input: CharacterStatsInput, base: BaseClass): number {
  const { agility, items } = input;

  let defense: number;

  switch (base) {
    case BaseClass.Elf:
      defense = Math.trunc(agility / 10);
      break;
    case BaseClass.Knight:
    case BaseClass.Summoner:
      defense = Math.trunc(agility / 3);
      break;
    case BaseClass.Wizard:
      defense = Math.trunc(agility / 4);
      break;
    case BaseClass.DarkLord:
      defense = Math.trunc(agility / 7);
      break;
    case BaseClass.RageFighter:
      defense = Math.trunc(agility / 8);
      break;
    default:
      defense = Math.trunc(agility / 5);
      break;
  }

  const defending = [
    InventoryConstants.LeftHandSlot,
    InventoryConstants.RightHandSlot,
    InventoryConstants.HelmSlot,
    InventoryConstants.ArmorSlot,
    InventoryConstants.PantsSlot,
    InventoryConstants.GlovesSlot,
    InventoryConstants.BootsSlot,
    InventoryConstants.WingsSlot,
  ];

  for (const slot of defending) {
    const item = equipped(items, slot);
    if (item) defense += itemDefense(item);
  }

  return defense;
}

function calculateDefenseRate(
  input: CharacterStatsInput,
  base: BaseClass
): number {
  const { agility, items } = input;

  let blocking: number;

  switch (base) {
    case BaseClass.Elf:
    case BaseClass.Summoner:
      blocking = Math.trunc(agility / 4);
      break;
    case BaseClass.DarkLord:
      blocking = Math.trunc(agility / 7);
      break;
    case BaseClass.RageFighter:
      blocking = Math.trunc(agility / 10);
      break;
    default:
      blocking = Math.trunc(agility / 3);
      break;
  }

  // EQUIPMENT_WEAPON_LEFT is slot 1, our RightHandSlot (ZzzInfomation.cpp:3222).
  const left = equipped(items, InventoryConstants.RightHandSlot);
  if (left && left.durability !== 0) {
    // The item's blocking and its +5 per option level both lose the durability percent (ZzzInfomation.cpp:3223-3236).
    const percent = durabilityPercent(left);
    const item = itemBlocking(left);
    const option = special(left, 'defenseRate', input);
    blocking += item - Math.trunc(item * percent) + option - Math.trunc(option * percent);
  }
  // Then +10% per piece with AT_IMPROVE_BLOCKING_PERCENT (:3237-3246).
  const { RightHandSlot, HelmSlot, ArmorSlot, PantsSlot, GlovesSlot, BootsSlot, Ring1Slot, Ring2Slot } = InventoryConstants;
  for (const slot of [RightHandSlot, HelmSlot, ArmorSlot, PantsSlot, GlovesSlot, BootsSlot, Ring2Slot, Ring1Slot]) {
    if (blockingPercent(equipped(items, slot), input)) blocking += Math.trunc((blocking * 10) / 100);
  }
  return blocking;
}

/** Excellent bit 1 on a shield, an armour piece or a ring (CalcExcellentOptions, ZzzInfomation.cpp:946-969), its needs met. */
function blockingPercent(item: Item | null, input: CharacterStatsInput): boolean {
  if (!item || item.durability === 0 || !(((item.excellentFlags ?? 0) >> 1) & 1)) return false;
  const takes = (item.group >= GROUP_SHIELD && item.group <= GROUP_BOOTS) || (item.group === GROUP_HELPER && [8, 9, 21, 22, 23, 24].includes(item.num));
  return takes && requiresMet(item, input);
}

function calculateDefenseRatePvp(
  input: CharacterStatsInput,
  base: BaseClass
): number {
  const { level, agility } = input;

  switch (base) {
    case BaseClass.Knight:
    case BaseClass.DarkLord:
    case BaseClass.Summoner:
      return Math.trunc(level * 2 + agility * 0.5);
    case BaseClass.Elf:
      return Math.trunc(level * 2 + agility * 0.1);
    case BaseClass.MagicGladiator:
    case BaseClass.Wizard:
      return Math.trunc(level * 2 + agility * 0.25);
    case BaseClass.RageFighter:
      return Math.trunc(level * 1.5 + agility * 0.2);
    default:
      return 0;
  }
}

/** The swords whose damage option reaches wizardry (ZzzInfomation.cpp:2888-2894). */
const MAGIC_SWORDS: ReadonlySet<number> = new Set([21, 23, 25, 28, 31]);
const IMPERIAL_SWORD = 28;

/** `IsRequireEquipItem` (ZzzInfomation.cpp:2209-2285): an item's options count only when the hero meets its needs. */
function requiresMet(item: Item, input: CharacterStatsInput): boolean {
  const stats = itemStats(item);
  if (!stats) return false;
  const { base, step } = classOf(input.charClass);
  // The stats already carry AddStrength and the rest (ZzzInfomation.cpp:2237-2241).
  const hero = { level: input.level, str: input.strength, agi: input.agility, vit: input.vitality, ene: input.energy, cmd: input.leadership, baseClass: base, stepClass: step };
  const columns = stats.def.classes;
  // The Magic Gladiator wears what both the wizard and the knight can (:2222-2225).
  if (!classCanUse(stats.def, hero) && !(base === 3 && columns[0] && columns[1] && !columns[3])) return false;
  // The harmony strength and agility cut (:2246-2259).
  const cut = harmonyNeedCut(item, input.options);
  return stats.reqLvl <= hero.level && stats.reqStr - cut.str <= hero.str && stats.reqAgi - cut.agi <= hero.agi && stats.reqEne <= hero.ene && stats.reqVit <= hero.vit && stats.reqCmd <= hero.cmd;
}

/** `PlusSpecial` (ZzzInfomation.cpp:2286-2300) of one option level kind. */
function special(item: Item | null, kind: OptionSpecial, input: CharacterStatsInput): number {
  if (!item || item.durability === 0 || !requiresMet(item, input)) return 0;
  const def = itemDef(item.group, item.num);
  let sum = 0;
  if (def) for (const line of optionSpecials(item, def)) if (line.kind === kind) sum += line.value;
  return sum;
}

/**
 * The excellent level / 20 and 2% bits of a weapon or a pendant (CalcExcellentOptions, ZzzInfomation.cpp:971-1004):
 * wizardry for a staff and the Lighting, Ice and Water pendants, damage for the rest.
 */
function excellentBits(item: Item | null, input: CharacterStatsInput, magic = true): { level: number; percent: number } {
  const none = { level: 0, percent: 0 };
  if (!item || item.durability === 0) return none;
  const pendant = item.group === GROUP_HELPER && [12, 13, 25, 26, 27, 28].includes(item.num);
  const magical = item.group === GROUP_STAFF || (pendant && [12, 25, 27].includes(item.num));
  if (!(pendant || item.group <= GROUP_STAFF) || magical !== magic || !requiresMet(item, input)) return none;
  const flags = item.excellentFlags ?? 0;
  return { level: (flags >> 4) & 1 ? Math.trunc(input.level / 20) : 0, percent: (flags >> 3) & 1 ? 2 : 0 };
}

/** `AT_IMPROVE_MAGIC_PERCENT` and `AT_IMPROVE_DAMAGE_PERCENT` of the Wizard's Ring +0 / +3 and item 13/107 (ZzzInfomation.cpp:1023-1050). */
function ringPercent(ring: Item | null, input: CharacterStatsInput): number {
  if (ring?.group !== GROUP_HELPER || ring.durability === 0 || !requiresMet(ring, input)) return 0;
  if (ring.num === 20 && [0, 3].includes(ring.lvl ?? 0)) return 10;
  return ring.num === 107 ? 15 : 0;
}

/** `CalculateMagicDamage` (ZzzInfomation.cpp:2848-3001): energy, then the items' wizardry options, worn by durability. */
function calculateWizardry(input: CharacterStatsInput): {
  min: number;
  max: number;
  /** Null without a staff or a magic sword in the right hand: the line then has no "(+N)". */
  percent: number | null;
} {
  const { energy, items } = input;
  const range = { min: Math.trunc(energy / 9), max: Math.trunc(energy / 4) };
  const add = (value: number) => {
    range.min += value;
    range.max += value;
  };
  const percent = (rate: number) => {
    range.min += Math.trunc((range.min * rate) / 100);
    range.max += Math.trunc((range.max * rate) / 100);
  };
  const excellent = (item: Item | null) => {
    const bits = excellentBits(item, input);
    add(bits.level);
    if (bits.percent) percent(bits.percent);
  };
  const worn = (value: number, item: Item, wing = false) => value - Math.trunc(value * durabilityPercent(item, wing));
  const base = getBaseClass(input.charClass);

  // pWeaponRight is EQUIPMENT_WEAPON_RIGHT, slot 0, our LeftHandSlot (NewUICharacterInfoWindow.cpp:509, :1346).
  const right = equipped(items, InventoryConstants.LeftHandSlot);
  const left = equipped(items, InventoryConstants.RightHandSlot);
  const wing = equipped(items, InventoryConstants.WingsSlot);
  const rightKind = (item: Item | null, swords: (num: number) => boolean): OptionSpecial =>
    item?.group === GROUP_SWORD && swords(item.num) ? 'damage' : 'wizardry';

  if (wing) add(worn(special(wing, 'wizardry', input), wing, true));
  if (right && right.durability !== 0) {
    add(worn(special(right, rightKind(right, num => MAGIC_SWORDS.has(num)), input), right));
    excellent(right);
  }
  const magicLeft = left && left.durability !== 0 && base !== BaseClass.Summoner;
  // A weapon in the left hand: its own option (:2914-2947).
  if (magicLeft && left.group <= GROUP_STAFF) {
    if (base !== BaseClass.MagicGladiator) add(worn(special(left, rightKind(left, num => num === IMPERIAL_SWORD), input), left));
    excellent(left);
  }
  // Anything in the left hand: the right weapon's option again, worn by the left item (:2950-2979).
  if (magicLeft) {
    if (base !== BaseClass.MagicGladiator) add(worn(special(right, rightKind(right, num => num === IMPERIAL_SWORD), input), left));
    excellent(left);
  }
  excellent(equipped(items, InventoryConstants.PendantSlot));
  for (const slot of [InventoryConstants.Ring1Slot, InventoryConstants.Ring2Slot]) {
    const rate = ringPercent(equipped(items, slot), input);
    if (rate) percent(rate);
  }

  // The window's magic percent: a staff's or a magic sword's, worn by the MagicDur share (NewUICharacterInfoWindow.cpp:1336-1351).
  if (!right || !(isStaff(right) || rightKind(right, num => MAGIC_SWORDS.has(num)) === 'damage')) return { ...range, percent: null };
  const power = Math.fround(itemMagicPower(right) / 100);
  const magicPercent = Math.fround(power - Math.fround(power * durabilityPercent(right, false, true)));
  return { ...range, percent: magicPercent };
}

/**
 * The window's harmony (`GetStrengthenCapability`, UIJewelHarmony.cpp:244-323) and 380 sums (NewUICharacterInfoWindow.cpp):
 * `maxMg` from every staff (:1241-1256); the hands' attack power and attack rate (:554-610); the armour's defense rate
 * (:612-629) and defense (:928-942); the 380 attack and defense (:631-668).
 */
function windowHarmony(input: CharacterStatsInput) {
  const sum = { magic: 0, min: 0, max: 0, attackRate: 0, defenseRate: 0, defense: 0 };
  input.items.slice(0, 12).forEach((item, slot) => {
    if (!item) return;
    const bonus = harmonyBonus(item, input.options);
    const value = bonus?.value ?? 0;
    const hand = slot < 2;
    if (bonus?.kind === 0 && hand) {
      if (bonus.option === 1 || bonus.option === 5) sum.min += value;
      if (bonus.option === 2 || bonus.option === 5) sum.max += value;
      if (bonus.option === 8) sum.attackRate += value;
    } else if (bonus?.kind === 1) {
      if (bonus.option === 1) sum.magic += value;
      if (bonus.option === 7 && hand) sum.attackRate += value;
    } else if (bonus?.kind === 2) {
      if (bonus.option === 1) sum.defense += value;
      if (bonus.option === 6) sum.defenseRate += value;
    }
    if (!hasGuardianOption(item)) return;
    for (const [option, add] of input.options?.addOptions[item.group * 512 + item.num] ?? []) {
      if (option === 1) sum.attackRate += add;
      if (option === 3) sum.defenseRate += add;
    }
  });
  return sum;
}

/** The summoner's curse skills, AT_SKILL_SUMMON_EXPLOSION and AT_SKILL_SUMMON_REQUIEM (_enum.h:436-437). */
const SUMMON_CURSES = new Set([223, 224]);

/**
 * `CalculateCurseDamage` (ZzzInfomation.cpp:3045-3104): energy, the wing's and the left hand's curse options worn by
 * durability, the left hand's excellent wizardry bits; then `GetCurseSkillDamage` (CharacterManager.cpp:373-390).
 */
function calculateCurse(input: CharacterStatsInput): Range {
  const range = { min: Math.trunc(input.energy / 9), max: Math.trunc(input.energy / 4) };
  const add = (value: number) => {
    range.min += value;
    range.max += value;
  };
  const wing = equipped(input.items, InventoryConstants.WingsSlot);
  if (wing) add(special(wing, 'curse', input) - Math.trunc(special(wing, 'curse', input) * durabilityPercent(wing, true)));
  // EQUIPMENT_WEAPON_LEFT, slot 1.
  const left = equipped(input.items, InventoryConstants.RightHandSlot);
  if (left && left.durability !== 0) {
    const option = special(left, 'curse', input);
    add(option - Math.trunc(option * durabilityPercent(left)));
    const bits = excellentBits(left, input);
    add(bits.level);
    if (bits.percent) {
      range.min += Math.trunc((range.min * bits.percent) / 100);
      range.max += Math.trunc((range.max * bits.percent) / 100);
    }
  }
  const skill = input.magicSkill;
  if (!skill || !SUMMON_CURSES.has(skill.number)) return range;
  return { min: range.min + skill.damage, max: range.max + skill.damage + Math.trunc(skill.damage / 2) };
}

/** The books, ITEM_BOOK_OF_SAHAMUTT to ITEM_STAFF + 29: their magic power is the curse rate (NewUICharacterInfoWindow.cpp:1449-1460); null without one. */
function curseRate(input: CharacterStatsInput, max: number): number | null {
  const left = equipped(input.items, InventoryConstants.RightHandSlot);
  if (left?.group !== GROUP_STAFF || left.num < 21 || left.num > 29) return null;
  const power = Math.fround(itemMagicPower(left) / 100);
  return Math.trunc(Math.fround(max * Math.fround(power - Math.fround(power * durabilityPercent(left, false, true)))));
}

/** `GetMagicSkillDamage` (CharacterManager.cpp:341-370) of the selected skill; no Season 6 set has a mastery row (option 29-35). */
function magicSkillDamage(range: Range, skill: CharacterStatsInput['magicSkill'], lines: readonly SetOptionLine[]): Range {
  if (skill && SUMMON_CURSES.has(skill.number)) return range;
  const damage = skill?.damage ?? 0;
  let min = range.min + damage;
  let max = range.max + damage + Math.trunc(damage / 2);
  const power = setSum(lines, SET.magicPower);
  if (power) {
    const ratio = Math.fround(1 + Math.fround(power / 100));
    min = Math.trunc(Math.fround(min * ratio));
    max = Math.trunc(Math.fround(max * ratio));
  }
  const attack = setSum(lines, SET.skillAttack);
  return { min: min + attack, max: max + attack };
}

/** The helpers the character window reads (NewUICharacterInfoWindow.cpp:707-737, :954-959). */
/** ITEM_ELITE_TRANSFER_SKELETON_RING, ITEM_HELPER + 39 (_enum.h:2742). */
const ELITE_SKELETON_RING = 39;
const PET = { imp: 1, fenrir: 37, demon: 64, guardian: 65, panda: 80, unicorn: 106, skeleton: 123 } as const;
/** The gold Fenrir's option bit. */
const FENRIR_GOLD = 0x04;

type Range = { min: number; max: number };

/**
 * A damage range after the pet: the gold Fenrir adds level / 12 to damage and level / 25 to
 * wizardry, then the Demon adds 40%, the Skeleton 20% (both unless expired) and the Imp 30% (not to curse).
 */
function withPet<T extends Range>(range: T, pet: Item | null, kind: 'damage' | 'wizardry' | 'curse', level: number): T {
  if (pet?.group !== GROUP_HELPER) return range;
  let { min, max } = range;
  if (pet.num === PET.fenrir && pet.excellentFlags === FENRIR_GOLD && kind !== 'curse') {
    const flat = Math.trunc(level / (kind === 'damage' ? 12 : 25));
    min += flat;
    max += flat;
  }
  const live = !periodExpired(pet);
  const rate = pet.num === PET.demon && live ? 0.4 : pet.num === PET.skeleton && live ? 0.2 : pet.num === PET.imp && kind !== 'curse' ? 0.3 : 0;
  return { ...range, min: min + Math.trunc(min * rate), max: max + Math.trunc(max * rate) };
}

/**
 * The Demon and the Skeleton turn the attack speed line magenta, the Spirit of Guardian the HP line, worn with
 * durability, needs met and not expired (NewUICharacterInfoWindow.cpp:1058-1068, :1144-1153).
 */
function petEvent(pet: Item | null, input: CharacterStatsInput): DerivedStats['petEvent'] {
  if (pet?.group !== GROUP_HELPER || pet.durability === 0 || !requiresMet(pet, input) || periodExpired(pet)) return null;
  if (pet.num === PET.demon || pet.num === PET.skeleton) return 'attackSpeed';
  return pet.num === PET.guardian ? 'hp' : null;
}

/** The Christmas, Panda and Skeleton transformation rings: the best one worn adds this much. */
const RING_BONUS: Readonly<Record<number, number>> = { 41: 20, 76: 30, 122: 40 };

/** A damage range after the rings (NewUICharacterInfoWindow.cpp:680-704, :1259-1294, :1395-1418); curse skips the Christmas ring. */
function withRing<T extends Range>(range: T, items: CharacterStatsInput['items'], kind: 'damage' | 'wizardry' | 'curse'): T {
  let bonus = 0;
  for (const slot of [InventoryConstants.Ring1Slot, InventoryConstants.Ring2Slot]) {
    const ring = equipped(items, slot);
    if (ring?.group !== GROUP_HELPER || (kind === 'curse' && ring.num === 41)) continue;
    bonus = Math.max(bonus, RING_BONUS[ring.num] ?? 0);
  }
  return bonus ? { ...range, min: range.min + bonus, max: range.max + bonus } : range;
}

/** `AT_SET_OPTION_*` past `AT_SET_OPTION_IMPROVE_STRENGTH` (_enum.h:3408-3442) that the window reads. */
const SET = { attackMin: 5, attackMax: 6, magicPower: 7, attackRate: 9, defense: 10, skillAttack: 19, shieldDefense: 22, byStr: 24, byAgi: 25, defenseByAgi: 26, defenseByVit: 27, magicByEne: 28 } as const;

/** `CSItemOption::PlusSpecial` (CSItemOption.cpp:477-485): the lit values of one option, summed. */
function setSum(lines: readonly SetOptionLine[], option: number): number {
  let sum = 0;
  for (const line of lines) if (line.option === option) sum += line.value;
  return sum;
}

/** `PlusSpecialLevel` (CSItemOption.cpp:497-523): the summed percent of `source`, once per lit option. */
function setByStat(lines: readonly SetOptionLine[], option: number, source: number): number {
  const count = lines.filter(line => line.option === option).length;
  return Math.trunc((source * setSum(lines, option)) / 100) * count;
}

/** `Defense` after the sets and sockets (ZzzInfomation.cpp:3361-3381). */
function withSetDefense(defense: number, input: CharacterStatsInput, lines: readonly SetOptionLine[], socket: SocketStatusBonus): number {
  defense += setSum(lines, SET.defense) + setByStat(lines, SET.defenseByAgi, input.agility) + setByStat(lines, SET.defenseByVit, input.vitality);
  const shield = equipped(input.items, InventoryConstants.RightHandSlot);
  if (shield && isShield(shield)) defense += Math.trunc((defense * setSum(lines, SET.shieldDefense)) / 100);
  defense += socket.defense;
  if (shield) defense += Math.trunc(itemDefense(shield) * socket.shieldDefense * 0.01);
  return defense;
}

export function deriveCharacterStats(bare: CharacterStatsInput): DerivedStats {
  const base = getBaseClass(bare.charClass);

  const { items, level } = bare;
  const { base: baseClass, step } = classOf(bare.charClass);
  const hero = { level, str: bare.strength, agi: bare.agility, vit: bare.vitality, ene: bare.energy, cmd: bare.leadership, baseClass, stepClass: step };
  // Every formula and requirement check reads Strength + AddStrength and the rest (ZzzInfomation.cpp:2550-2553, :2851, :3108-3110).
  const add = wornStatBonus(items, bare.sets ?? null);
  add.vit += buffVitality(bare);
  const input = { ...bare, strength: bare.strength + add.str, agility: bare.agility + add.agi, vitality: bare.vitality + add.vit, energy: bare.energy + add.ene, leadership: bare.leadership + add.cmd };
  const lines = input.sets ? activeSetOptions(items, hero, input.sets) : [];
  const socket = socketStatusBonus(items, { level, masterLevel: input.masterLevel, maxLife: input.maxLife, maxMana: input.maxMana }, input.options ?? null);
  const setDamage = setByStat(lines, SET.byAgi, input.agility) + setByStat(lines, SET.byStr, input.strength);
  const flat = {
    set: { min: setSum(lines, SET.attackMin) + setDamage, max: setSum(lines, SET.attackMax) + setDamage },
    socket: { min: socket.damageMin, max: socket.damageMax },
  };
  const pet = equipped(items, InventoryConstants.PetSlot);
  const damage = withPet(withRing(calculateDamage(input, base, flat), items, 'damage'), pet, 'damage', level);
  // CalculateMagicDamage (ZzzInfomation.cpp:3005-3035).
  const magic = calculateWizardry(input);
  const magicBonus = setByStat(lines, SET.magicByEne, input.energy) + socket.skillDamage + socket.magicPower;
  // The window's line reads the selected skill's damage (NewUICharacterInfoWindow.cpp:1226-1230).
  const skilled = magicSkillDamage({ min: magic.min + magicBonus, max: magic.max + magicBonus }, input.magicSkill, lines);
  const wizardry = withPet(withRing(skilled, items, 'wizardry'), pet, 'wizardry', level);
  const harmony = windowHarmony(input);
  const maxMg = harmony.magic;
  const curse = withPet(withRing(calculateCurse(input), items, 'curse'), pet, 'curse', level);
  // The Panda and the Unicorn add 50 defense.
  const petDefense = pet?.group === GROUP_HELPER && (pet.num === PET.panda || pet.num === PET.unicorn) ? 50 : 0;
  // The elite skeleton ring in either hand adds a tenth, harmony included (NewUICharacterInfoWindow.cpp:946-952).
  const defense = withSetDefense(calculateDefense(input, base), input, lines, socket) + harmony.defense;
  const defenseRate = Math.trunc(calculateDefenseRate(input, base) * socket.defenseRate);
  const eliteRing = [InventoryConstants.Ring1Slot, InventoryConstants.Ring2Slot].some(slot => {
    const ring = equipped(items, slot);
    return ring?.group === GROUP_HELPER && ring.num === ELITE_SKELETON_RING;
  });

  return {
    attackSpeed: attackSpeedOf(bare.charClass, bare.agility),
    magicSpeed: magicSpeedOf(bare.charClass, bare.agility),
    damageMin: damage.min + harmony.min,
    damageMax: damage.max + harmony.max,
    damageBlue: damage.blue,
    petEvent: petEvent(pet, input),
    attackRate: calculateAttackRate(input, base) + setSum(lines, SET.attackRate) + socket.attackRate,
    attackRatePvp: calculateAttackRatePvp(input, base),
    attackRatePvpBonus: harmony.attackRate,
    defense: defense + (eliteRing ? Math.trunc(defense / 10) : 0) + petDefense,
    harmonyDefense: harmony.defense,
    defenseRate,
    blockingBuff: buffBlocking(bare, defenseRate),
    defenseRatePvp: calculateDefenseRatePvp(input, base),
    defenseRatePvpBonus: harmony.defenseRate,
    wizardryMin: wizardry.min + maxMg,
    wizardryMax: wizardry.max + maxMg,
    // (int)((iMagicDamageMaxInitial + maxMg) * magicPercent) (:1352).
    staffRate: magic.percent === null ? null : Math.trunc(Math.fround((skilled.max + maxMg) * magic.percent)),
    curseMin: curse.min,
    curseMax: curse.max,
    curseRate: curseRate(input, curse.max),
    totals: { str: input.strength, agi: input.agility, vit: input.vitality, ene: input.energy, cmd: input.leadership },
    added: { str: add.str, agi: add.agi, vit: add.vit, ene: add.ene, cmd: add.cmd },
  };
}

/** `gCharacterManager.IsMasterLevel(Class)`: the third-class characters. */
const MASTER_CLASSES: ReadonlySet<CharacterClassNumber> = new Set([
  CharacterClassNumber.GrandMaster,
  CharacterClassNumber.BladeMaster,
  CharacterClassNumber.HighElf,
  CharacterClassNumber.DuelMaster,
  CharacterClassNumber.LordEmperor,
  CharacterClassNumber.DimensionMaster,
  CharacterClassNumber.FistMaster,
]);

export function isMasterClass(cls: CharacterClassNumber): boolean {
  return MASTER_CLASSES.has(cls);
}

/** `IsMasterExperienceActive` (CharacterManager.cpp:228-231): kills feed master experience instead of normal experience. */
const MASTER_EXPERIENCE_LEVEL = 400;

export function masterExperienceActive(cls: CharacterClassNumber, level: number): boolean {
  return isMasterClass(cls) && level >= MASTER_EXPERIENCE_LEVEL;
}
