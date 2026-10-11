import { t, type TextKey } from '../../i18n';
import { BaseClass, CharacterClassNumber, getBaseClass } from '../../core/types';
import { ItemsDatabase } from '@versions/shared/items/itemsDatabase';
import { InventoryConstants } from '@/core/inventoryConstants';
import type { Item } from '../../ecs/world';
import { activeSetOptions, classOf, socketStatusBonus, type SetOptionLine, type SocketStatusBonus } from '@/controllers/item_rules';
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

const GROUP_MACE = 2;
const GROUP_BOW = 4;
const GROUP_STAFF = 5;
const GROUP_SHIELD = 6;
const GROUP_WING = 12;
const GROUP_HELPER = 13;

function isBow(item: Item): boolean {
  return item.group === GROUP_BOW && item.num <= 6;
}

function isCrossbow(item: Item): boolean {
  return item.group === GROUP_BOW && item.num >= 8 && item.num <= 14;
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
};

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

type DerivedStats = {
  attackSpeed: number;
  magicSpeed: number;
  damageMin: number;
  damageMax: number;
  attackRate: number;
  attackRatePvp: number;
  defense: number;
  defenseRate: number;
  defenseRatePvp: number;
  dualWield: boolean;
  wizardryMin: number;
  wizardryMax: number;
  staffRate: number;
  curseMin: number;
  curseMax: number;
};

function equipped(items: (Item | null)[], slot: number): Item | null {
  return items[slot] ?? null;
}

function calculateDamage(
  input: CharacterStatsInput,
  base: BaseClass,
  flat: Range
): { min: number; max: number; dualWield: boolean } {
  const { strength, agility, energy, vitality, items } = input;

  const weaponRight = equipped(items, InventoryConstants.LeftHandSlot);
  const weaponLeft = equipped(items, InventoryConstants.RightHandSlot);

  let statMin = 0;
  let statMax = 0;

  const usingBow =
    (!!weaponLeft && isBow(weaponLeft)) ||
    (!!weaponRight && isCrossbow(weaponRight));

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

  let minRight = statMin;
  let maxRight = statMax;
  let minLeft = statMin;
  let maxLeft = statMax;

  if (weaponRight) {
    const damage = itemDamage(weaponRight);

    if (isStaff(weaponRight)) {
      minLeft += damage.min;
      maxLeft += damage.max;
    } else {
      minRight += damage.min;
      maxRight += damage.max;
    }
  }

  if (weaponLeft) {
    const damage = itemDamage(weaponLeft);
    minLeft += damage.min;
    maxLeft += damage.max;
  }

  // The set and socket damage reach both hands (ZzzInfomation.cpp:2745-2767, :2809-2812).
  minRight += flat.min;
  minLeft += flat.min;
  maxRight += flat.max;
  maxLeft += flat.max;

  let min: number;
  let max: number;

  if (!!weaponRight && isCrossbow(weaponRight)) {
    min = minRight;
    max = maxRight;
  } else if (!!weaponLeft && isBow(weaponLeft)) {
    min = minLeft;
    max = maxLeft;
  } else if (!weaponRight || isStaff(weaponRight)) {
    min = minLeft;
    max = maxLeft;
  } else {
    min = minRight;
    max = maxRight;
  }

  let dualWield = false;

  const bothHands = !!weaponRight && !!weaponLeft;

  if (base === BaseClass.Knight || base === BaseClass.MagicGladiator) {
    if (
      bothHands &&
      weaponRight!.group <= GROUP_STAFF &&
      weaponLeft!.group <= GROUP_STAFF
    ) {
      dualWield = true;
      min = Math.trunc((minRight * 55) / 100) + Math.trunc((minLeft * 55) / 100);
      max = Math.trunc((maxRight * 55) / 100) + Math.trunc((maxLeft * 55) / 100);
    }
  } else if (base === BaseClass.RageFighter) {
    if (
      bothHands &&
      weaponRight!.group <= GROUP_MACE &&
      weaponLeft!.group <= GROUP_MACE
    ) {
      dualWield = true;
      min = Math.trunc(((minRight + minLeft) * 60) / 100);
      max = Math.trunc(((maxRight + maxLeft) * 65) / 100);
    }
  }

  return { min, max, dualWield };
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

  const left = equipped(items, InventoryConstants.LeftHandSlot);
  if (left) blocking += itemBlocking(left);

  return blocking;
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

function calculateWizardry(input: CharacterStatsInput): {
  min: number;
  max: number;
  rate: number;
} {
  const { energy, items } = input;

  let min = Math.trunc(energy / 9);
  let max = Math.trunc(energy / 4);
  let rate = 0;

  const right = equipped(items, InventoryConstants.RightHandSlot);

  if (right && isStaff(right)) {
    const damage = itemDamage(right);
    min += damage.min;
    max += damage.max;
    rate = itemMagicPower(right);
  }

  return { min, max, rate };
}

/** The helpers the character window reads (NewUICharacterInfoWindow.cpp:707-737, :954-959). */
const PET = { imp: 1, fenrir: 37, demon: 64, panda: 80, unicorn: 106, skeleton: 123 } as const;
/** The gold Fenrir's option bit. */
const FENRIR_GOLD = 0x04;

type Range = { min: number; max: number };

/**
 * A damage range after the pet: the gold Fenrir adds level / 12 to damage and level / 25 to
 * wizardry, then the Demon adds 40%, the Skeleton 20% and the Imp 30% (not to curse).
 */
function withPet<T extends Range>(range: T, pet: Item | null, kind: 'damage' | 'wizardry' | 'curse', level: number): T {
  if (pet?.group !== GROUP_HELPER) return range;
  let { min, max } = range;
  if (pet.num === PET.fenrir && pet.excellentFlags === FENRIR_GOLD && kind !== 'curse') {
    const flat = Math.trunc(level / (kind === 'damage' ? 12 : 25));
    min += flat;
    max += flat;
  }
  const rate = pet.num === PET.demon ? 0.4 : pet.num === PET.skeleton ? 0.2 : pet.num === PET.imp && kind !== 'curse' ? 0.3 : 0;
  return { ...range, min: min + Math.trunc(min * rate), max: max + Math.trunc(max * rate) };
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
const SET = { attackMin: 5, attackMax: 6, attackRate: 9, defense: 10, shieldDefense: 22, byStr: 24, byAgi: 25, defenseByAgi: 26, defenseByVit: 27, magicByEne: 28 } as const;

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

export function deriveCharacterStats(input: CharacterStatsInput): DerivedStats {
  const base = getBaseClass(input.charClass);

  const { items, level } = input;
  const { base: baseClass, step } = classOf(input.charClass);
  const hero = { level, str: input.strength, agi: input.agility, vit: input.vitality, ene: input.energy, cmd: input.leadership, baseClass, stepClass: step };
  const lines = input.sets ? activeSetOptions(items, hero, input.sets) : [];
  const socket = socketStatusBonus(items, { level, masterLevel: input.masterLevel, maxLife: input.maxLife, maxMana: input.maxMana }, input.options ?? null);
  const setDamage = setByStat(lines, SET.byAgi, input.agility) + setByStat(lines, SET.byStr, input.strength);
  const flat = { min: setSum(lines, SET.attackMin) + setDamage + socket.damageMin, max: setSum(lines, SET.attackMax) + setDamage + socket.damageMax };
  const pet = equipped(items, InventoryConstants.PetSlot);
  const damage = withPet(withRing(calculateDamage(input, base, flat), items, 'damage'), pet, 'damage', level);
  // CalculateMagicDamage (ZzzInfomation.cpp:3005-3035).
  const magic = calculateWizardry(input);
  const magicBonus = setByStat(lines, SET.magicByEne, input.energy) + socket.skillDamage + socket.magicPower;
  const wizardry = withPet(withRing({ ...magic, min: magic.min + magicBonus, max: magic.max + magicBonus }, items, 'wizardry'), pet, 'wizardry', level);
  const curse = withPet(withRing({ min: Math.trunc(input.energy / 9), max: Math.trunc(input.energy / 4) }, items, 'curse'), pet, 'curse', level);
  // The Panda and the Unicorn add 50 defense.
  const petDefense = pet?.group === GROUP_HELPER && (pet.num === PET.panda || pet.num === PET.unicorn) ? 50 : 0;

  return {
    attackSpeed: attackSpeedOf(input.charClass, input.agility),
    magicSpeed: magicSpeedOf(input.charClass, input.agility),
    damageMin: damage.min,
    damageMax: damage.max,
    dualWield: damage.dualWield,
    attackRate: calculateAttackRate(input, base) + setSum(lines, SET.attackRate) + socket.attackRate,
    attackRatePvp: calculateAttackRatePvp(input, base),
    defense: withSetDefense(calculateDefense(input, base), input, lines, socket) + petDefense,
    defenseRate: Math.trunc(calculateDefenseRate(input, base) * socket.defenseRate),
    defenseRatePvp: calculateDefenseRatePvp(input, base),
    wizardryMin: wizardry.min,
    wizardryMax: wizardry.max,
    staffRate: wizardry.rate,
    curseMin: curse.min,
    curseMax: curse.max,
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
