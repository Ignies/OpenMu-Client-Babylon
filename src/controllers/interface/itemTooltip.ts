import { t, type TextKey } from '../../i18n';
import type { Item } from '../../ecs/world';
import {
  ItemGroup,
  classCanUse,
  classUnrestricted,
  isArmorPart,
  isCapeOfFighter,
  isCapeOfLord,
  isDivineArchangelWeapon,
  isFirstWing,
  isJewel,
  isPendant,
  isRing,
  isScepter,
  isSecondWing,
  isShield,
  isStaff,
  isSummonerBook,
  isThirdWing,
  isWeapon,
  isWeaponOfArchangel,
  isWing,
  itemStats,
  type HeroStats,
  type ItemDef,
  type ItemStats,
} from '@/controllers/item_rules';
import {
  ancientSetOf,
  harmonyOf,
  hasGuardianOption,
  hasSpecial,
  optionSpecials,
  setOptionLines,
  skillMana,
  socketBonusOf,
  socketOptionValue,
  socketsOf,
  wingOptions,
  withWornStats,
  wornSetPieces,
  type OptionSpecial,
  type WingOption,
} from '@/controllers/item_rules';
import { itemBaseName } from '@versions/shared/items/itemsDatabase';
import { itemLevelName } from '@/controllers/item_rules';
import { learnableSkill } from '@/controllers/item_rules';
import { itemOptionTables, skillDisplayName, type SocketOption } from '@/controllers/assets';

/**
 * `RenderItemInfo` (ZzzInventory.cpp:2091) as data: the tooltip is a list
 * of coloured lines, blank lines being half-height spacers, drawn by
 * `RenderTipTextList`. Only the paths the clone can reach are ported - the
 * generic equipment block, wings, pets, jewels and the option/excellent
 * lines; event items fall back to their name.
 *
 * `GlobalText` is not available here (Text.bmd is encoded), so the English
 * strings are written out inline.
 */

/** `TEXT_COLOR_*` (_define.h:219) as the tooltip renders them. */
type TooltipColor =
  | 'white'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkRed'
  | 'purple'
  | 'darkBlue'
  | 'darkYellow'
  | 'greenBlue'
  | 'gray'
  | 'redPurple'
  | 'violet'
  | 'orange';

/**
 * The `(+N)` / `(-N)` tail a line grows when the item is being compared with
 * the worn one. Green is the better number, red the worse, which for a
 * requirement means the smaller one.
 */
type TooltipDelta = {
  text: string;
  color: 'green' | 'red';
};

export type TooltipLine = {
  text: string;
  color: TooltipColor;
  bold: boolean;
  /** A `"\n"` entry: half a line of space. */
  blank?: true;
  delta?: TooltipDelta;
};

type ItemTooltipData = {
  lines: TooltipLine[];
  /** Every requirement and the class gate pass for the hero. */
  usable: boolean;
};

const CLASS_NAME_KEYS: readonly (readonly [TextKey, TextKey, TextKey])[] = [
  ['class.darkWizard', 'class.soulMaster', 'class.grandMaster'],
  ['class.darkKnight', 'class.bladeKnight', 'class.bladeMaster'],
  ['class.fairyElf', 'class.museElf', 'class.highElf'],
  ['class.magicGladiator', 'class.magicGladiator', 'class.duelMaster'],
  ['class.darkLord', 'class.darkLord', 'class.lordEmperor'],
  ['class.summoner', 'class.bloodySummoner', 'class.dimensionMaster'],
  // No second class, so step 2 falls back to the first name, as MG and DL do.
  ['class.rageFighter', 'class.rageFighter', 'class.fistMaster'],
];

const RESISTANCE_NAME_KEYS: readonly TextKey[] = [
  'element.ice',
  'element.poison',
  'element.lightning',
  'element.fire',
  'element.earth',
  'element.wind',
  'element.water',
];

class Lines {
  readonly list: TooltipLine[] = [];

  add(
    text: string,
    color: TooltipColor = 'white',
    bold = false,
    delta?: TooltipDelta
  ) {
    this.list.push(delta ? { text, color, bold, delta } : { text, color, bold });
  }

  blank() {
    // The original never stacks two spacers back to back.
    if (this.list.at(-1)?.blank) return;
    this.list.push({ text: '', color: 'white', bold: false, blank: true });
  }
}

/** The first block of `RenderItemInfo`: which colour the name line takes. */
function nameColor(item: Item, def: ItemDef, level: number): TooltipColor {
  // SpecialNum > 0: any skill, luck, option or excellent line (ZzzInventory.cpp:2148-2152).
  const special = hasSpecial(item, def);

  if (isFenrir(def)) return 'blue';
  if (isJewel(def) || isWeaponOfArchangel(def)) return 'yellow';
  if (isDivineArchangelWeapon(def)) return 'purple';
  if (item.isAncient) return 'greenBlue';
  if ((item.socketCount ?? 0) > 0) return 'violet';
  if (isWing(def)) {
    if (level >= 7) return 'yellow';
    return special ? 'blue' : 'white';
  }
  // Every excellent option is a Special, so excellent is always green (ZzzInventory.cpp:2140).
  if (item.isExcellent) return 'green';
  if (level >= 7) return 'yellow';
  return special ? 'blue' : 'white';
}

/** The colour the tooltip's name line takes, for anything else that names the item. */
export function itemNameColor(item: Item): TooltipColor {
  const stats = itemStats(item);
  return stats ? nameColor(item, stats.def, stats.level) : 'white';
}

/** `ITEM_HORN_OF_FENRIR`. */
const isFenrir = (def: ItemDef) => def.group === ItemGroup.Helper && def.index === 37;
/** The Horn of Fenrir's variant, by its option bits (ZzzInventory.cpp:2526-2539). */
const FENRIR_VARIANT: Readonly<Record<number, TextKey>> = {
  0x01: 'item.fenrir.destroy',
  0x02: 'item.fenrir.protect',
  0x04: 'item.fenrir.illusion',
};

function nameLine(item: Item, def: ItemDef, level: number): string {
  let name = itemBaseName(def.group, def.index) || def.name;
  const variant = isFenrir(def) ? FENRIR_VARIANT[(item.excellentFlags ?? 0) & 0x3f] : undefined;
  if (variant) return `${name} ${t(variant)}`;
  // `GetSetItemName`: the set's name goes in front (ZzzInventory.cpp:2586).
  const set = ancientSetOf(item);
  if (set) name = `${set.name} ${name}`;
  if (item.isExcellent) name = t('item.excellentPrefix', { name });
  return itemLevelName(def.group, def.index, level, name);
}

/**
 * The first tooltip line on its own, for the message boxes that name an
 * item ("Asking price for Excellent Dragon Armour +9").
 */
export function itemDisplayName(item: Item): string {
  const stats = itemStats(item);
  if (!stats) return t('item.thisItem');
  return nameLine(item, stats.def, stats.level);
}

/** `CalcExcellentOptions` order and `GetSpecialOptionText` wording. */
function excellentLines(out: Lines, def: ItemDef, flags: number) {
  const armorLike = isShield(def) || isArmorPart(def) || isRing(def);
  const weaponLike = isWeapon(def) || isPendant(def);

  if (armorLike) {
    if (flags & 0x20) out.add(t('item.exc.maxLife'), 'blue');
    if (flags & 0x10) out.add(t('item.exc.maxMana'), 'blue');
    if (flags & 0x08) out.add(t('item.exc.damageDecrease'), 'blue');
    if (flags & 0x04) out.add(t('item.exc.reflect'), 'blue');
    if (flags & 0x02) out.add(t('item.exc.defenseRate'), 'blue');
    if (flags & 0x01) out.add(t('item.exc.zen'), 'blue');
  }

  if (weaponLike) {
    const magic =
      isStaff(def) ||
      (def.group === ItemGroup.Helper &&
        [12, 25, 26].includes(def.index)); // Lightning / Ice / Water pendants
    const kind = t(magic ? 'item.kind.wizardry' : 'item.kind.damage');

    if (flags & 0x20) out.add(t('item.exc.excellentDamage'), 'blue');
    if (flags & 0x10) out.add(t('item.exc.perLevel', { kind }), 'blue');
    if (flags & 0x08) out.add(t('item.exc.percent', { kind }), 'blue');
    if (flags & 0x04) out.add(t('item.exc.speed'), 'blue');
    if (flags & 0x02) out.add(t('item.exc.life'), 'blue');
    if (flags & 0x01) out.add(t('item.exc.mana'), 'blue');
  }
}

const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

/**
 * The tail for one number against the worn item's. `lowerIsBetter` for the
 * requirement lines, where needing less is the upgrade.
 */
function statDelta(
  now: number,
  before: number | undefined,
  lowerIsBetter = false
): TooltipDelta | undefined {
  if (before === undefined) return undefined;
  const diff = now - before;
  if (diff === 0) return undefined;
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  return { text: `(${signed(diff)})`, color: better ? 'green' : 'red' };
}

/** Both ends of the damage range in one tail: `(+3 / +5)`. */
function damageDelta(
  min: number,
  max: number,
  before: { damageMin: number; damageMax: number } | undefined
): TooltipDelta | undefined {
  if (!before) return undefined;
  const low = min - before.damageMin;
  const high = max - before.damageMax;
  if (low === 0 && high === 0) return undefined;

  const total = low + high;
  const better = total !== 0 ? total > 0 : high > 0;
  return {
    text:
      low === high
        ? `(${signed(low)})`
        : `(${signed(low)} / ${signed(high)})`,
    color: better ? 'green' : 'red',
  };
}

function requirementLine(
  out: Lines,
  labelKey: TextKey,
  required: number,
  have: number,
  before?: number
) {
  if (!required) return;
  const label = t(labelKey);
  const line = t('item.required', { label, value: required });
  const delta = statDelta(required, before, true);
  if (have < required) {
    out.add(line, 'red', false, delta);
    out.add(t('item.moreNeeded', { value: required - have }), 'red');
  } else {
    out.add(line, 'white', false, delta);
  }
}

/** `RequireClass` (ZzzInventory.cpp:604). */
function classLines(out: Lines, def: ItemDef, hero: HeroStats) {
  if (classUnrestricted(def)) return;
  if (def.classes.every(value => value === 0)) return;

  out.blank();
  def.classes.forEach((required, index) => {
    if (required === 0) return;
    const usable =
      index === hero.baseClass && required <= hero.stepClass;
    const name = t(CLASS_NAME_KEYS[index][Math.min(3, required) - 1]);
    out.add(t('item.canBeEquippedBy', { name }), usable ? 'white' : 'darkRed');
  });
}

function wingLines(out: Lines, def: ItemDef, level: number) {
  if (isFirstWing(def)) {
    out.add(t('item.increaseDamage', { value: 12 + level * 2 }));
    out.add(t('item.absorbDamage', { value: 12 + level * 2 }));
    out.add(t('item.increaseSpeed'));
  } else if (isSecondWing(def)) {
    out.add(t('item.increaseDamage', { value: 32 + level }));
    out.add(t('item.absorbDamage', { value: 25 + level * 2 }));
    out.add(t('item.increaseSpeed'));
  } else if (isThirdWing(def)) {
    out.add(t('item.increaseDamage', { value: 39 + level * 2 }));
    // Cape of Emperor / Overrule absorb less.
    const absorb = def.index === 40 || def.index === 50 ? 24 : 39;
    out.add(t('item.absorbDamage', { value: absorb + level * 2 }));
    out.add(t('item.increaseSpeed'));
  } else if (isCapeOfLord(def) || isCapeOfFighter(def)) {
    out.add(t('item.increaseDamage', { value: 20 + level * 2 }));
    const absorb = isCapeOfFighter(def) ? 10 + level * 2 : 10 + level;
    out.add(t('item.absorbDamage', { value: absorb }));
  }
}

type PetLine = readonly [TextKey, TooltipColor];

/** The pets' lines right under the name (ZzzInventory.cpp:3060-3135), by helper index. */
const PET_LINES: Readonly<Record<number, readonly PetLine[]>> = {
  64: [['item.pet.demon', 'blue'], ['item.pet.attackSpeed10', 'purple']],
  65: [['item.pet.guardianDamage', 'blue'], ['item.pet.guardianLife', 'purple']],
  67: [['item.pet.zenCollect', 'blue']],
  123: [['item.pet.zenCollect', 'blue'], ['item.pet.skeletonDamage', 'blue'], ['item.pet.attackSpeed10', 'blue'], ['item.pet.skeletonExp', 'blue']],
  80: [['item.pet.autoZen', 'blue'], ['item.pet.exp50', 'blue'], ['item.pet.defense50', 'blue']],
  106: [['item.pet.autoZen', 'blue'], ['item.pet.zen50', 'blue'], ['item.pet.defense50', 'blue']],
};

function petLines(out: Lines, def: ItemDef) {
  if (def.group !== ItemGroup.Helper) return;
  for (const [key, color] of PET_LINES[def.index] ?? []) out.add(t(key), color);
}

/** Guardian Angel, Imp and Horn of Dinorant, beside the wing lines (ZzzInventory.cpp:4196-4207, :4306-4311). */
function helperLines(out: Lines, def: ItemDef) {
  if (def.group !== ItemGroup.Helper) return;
  if (def.index === 0) {
    out.add(t('item.absorbDamage', { value: 20 }));
    out.add(t('item.pet.maxHp', { value: 50 }));
  } else if (def.index === 1) {
    out.add(t('item.pet.imp'));
  } else if (def.index === 3) {
    out.add(t('item.increaseDamage', { value: 15 }));
    out.add(t('item.absorbDamage', { value: 10 }));
  }
}

function jewelLines(out: Lines, def: ItemDef) {
  if (def.group === ItemGroup.Potion) {
    switch (def.index) {
      case 13:
        out.add(t('item.raiseLevel6'));
        return;
      case 14:
        out.add(t('item.raiseLevel9'));
        return;
      case 16:
        out.add(t('item.addOption'));
        return;
      case 22:
        out.add(t('item.createFruit'));
        return;
      case 31:
        out.add(t('item.addGuardian'));
        return;
    }
  }
  if (def.group === ItemGroup.Wing && def.index === 15) {
    out.add(t('item.chaosCombination'));
  }
}

/** Potions, scrolls and orbs: one line of what they do. */
function consumableLines(out: Lines, def: ItemDef, item: Item) {
  if (def.group === ItemGroup.Potion) {
    const count = item.durability ?? 0;
    if (def.index <= 3) out.add(t('item.restoresHp', { count }));
    else if (def.index >= 4 && def.index <= 6) out.add(t('item.restoresMp', { count }));
    else if (def.index === 8) out.add(t('item.curesPoison', { count }));
    else if (def.index === 9) out.add(t('item.liquor', { count }));
    else if (def.index === 10) out.add(t('item.townScroll', { count }));
    // The SD and complex potions (ZzzInventory.cpp:4556-4559).
    else if (def.index >= 35 && def.index <= 40) out.add(t('item.count', { count }));
    return;
  }
  // Orbs, scrolls and crystals name the skill they teach.
  const taught = learnableSkill(item);
  const skill = taught === undefined ? undefined : skillDisplayName(taught);
  if (skill) out.add(t('item.learns', { skill }), 'blue');
}

/** Splinter of Armor, Bless of Guardian, Claw of Beast: the pieces their mix takes. */
const FENRIR_MATERIAL_PIECES: Readonly<Record<number, number>> = { 32: 20, 33: 20, 34: 10 };

/** Skill numbers of the Divine Sword and Crossbow of Archangel. */
const CYCLONE = 22;
const TRIPLE_SHOT = 24;

/**
 * What the Weapon of Archangel shows at level 0 / 1 / 2 (staff / sword /
 * crossbow). The original writes these numbers out rather than reading
 * them from any item (ZzzInventory.cpp:3499-3521).
 */
const WEAPON_OF_ARCHANGEL_STATS: readonly {
  label: TextKey;
  damage: readonly [number, number];
  speed: number;
  str: number;
  agi: number;
  skill?: number;
}[] = [
  { label: 'item.wizardryDamage', damage: [107, 110], speed: 20, str: 132, agi: 32 },
  { label: 'item.attackPowerOneHand', damage: [110, 120], speed: 35, str: 381, agi: 149, skill: CYCLONE },
  { label: 'item.attackPowerTwoHand', damage: [120, 140], speed: 35, str: 140, agi: 350, skill: TRIPLE_SHOT },
];

/**
 * The Weapon of Archangel's own block (`RenderItemInfo`,
 * ZzzInventory.cpp:3487-3560): a quest item, the reward it is worth, and the
 * Divine weapon it stands for - with no durability line.
 */
function weaponOfArchangelLines(out: Lines, level: number) {
  out.add(t('item.questItem'));
  out.add(t('item.archangelReward'), 'darkRed');

  const stats = WEAPON_OF_ARCHANGEL_STATS[level];
  if (!stats) return;

  out.blank();
  const [min, max] = stats.damage;
  out.add(t('item.damageRange', { label: t(stats.label), min, max }));
  out.add(t('item.attackSpeed', { value: stats.speed }));
  out.add(t('item.required', { label: t('stat.strength'), value: stats.str }));
  out.add(t('item.required', { label: t('stat.agility'), value: stats.agi }));

  out.blank();
  out.add(t('item.luckSoul'), 'blue');
  out.add(t('item.luckCritical'), 'blue');

  const skill = stats.skill === undefined ? undefined : skillDisplayName(stats.skill);
  if (stats.skill === undefined) {
    out.add(
      t('item.percentBonus', { label: t('item.wizardryIncrease'), value: 53 }),
      'blue',
      true
    );
  } else {
    out.add(skill ? t('item.skillNamed', { skill }) : t('item.skill'), 'blue');
  }

  const kind = t(stats.skill === undefined ? 'item.kind.wizardry' : 'item.kind.damage');
  out.add(t('item.exc.perLevel', { kind }), 'blue');
  out.add(t('item.exc.percent', { kind }), 'blue');
  out.add(t('item.exc.excellentDamage'), 'blue');
  out.add(t('item.exc.speed'), 'blue');
  out.add(t('item.exc.life'), 'blue');
  out.add(t('item.exc.mana'), 'blue');
}

/**
 * Builds the tooltip for `item` as seen by `hero`. `compareWith` is the worn
 * item of the slot this one would take: its numbers become the `(+N)` tails
 * on the lines the two share. The worn item's own tooltip is this same
 * builder called without it.
 */
export function buildItemTooltip(
  item: Item,
  hero: HeroStats,
  compareWith?: Item | null,
  extras?: TooltipExtras
): ItemTooltipData | null {
  const stats = itemStats(item);
  if (!stats) return null;

  const { def, level } = stats;
  const out = new Lines();
  const worn = compareWith ? itemStats(compareWith) : null;

  out.blank();
  out.add(nameLine(item, def, level), nameColor(item, def, level), true);
  out.blank();

  if (isWeaponOfArchangel(def)) {
    weaponOfArchangelLines(out, level);
    return { lines: trimBlanks(out.list), usable: true };
  }

  petLines(out, def);
  equipmentLines(out, item, stats, hero, worn);
  setOptionBlock(out, item, hero, extras);
  socketLines(out, item, hero, extras);

  const requirementsFail =
    hero.level < stats.reqLvl ||
    hero.str < stats.reqStr ||
    hero.agi < stats.reqAgi ||
    hero.vit < stats.reqVit ||
    hero.ene < stats.reqEne ||
    hero.cmd < stats.reqCmd;

  return {
    lines: trimBlanks(out.list),
    usable: !requirementsFail && classCanUse(def, hero),
  };
}

function equipmentLines(
  out: Lines,
  item: Item,
  stats: ItemStats,
  hero: HeroStats,
  worn: ItemStats | null = null
) {
  const { def, level, isExcellent } = stats;

  // Attack power
  if (def.damageMin) {
    const label = t(
      def.group === ItemGroup.Etc
        ? 'item.attackPower'
        : def.twoHand
          ? 'item.attackPowerTwoHand'
          : 'item.attackPowerOneHand'
    );
    const min = stats.damageMin;
    const max = stats.damageMax;
    out.add(
      t('item.damageRange', { label, min: min >= max ? max : min, max }),
      isExcellent ? 'blue' : 'white',
      false,
      damageDelta(min, max, worn ?? undefined)
    );
  }

  if (stats.defense) {
    out.add(
      t('item.defense', { value: stats.defense }),
      isArmorPart(def) && isExcellent ? 'blue' : 'white',
      false,
      statDelta(stats.defense, worn?.defense)
    );
  }

  if (def.blocking) {
    out.add(
      t('item.defenseRate', { value: stats.blocking }),
      isExcellent ? 'blue' : 'white',
      false,
      statDelta(stats.blocking, worn?.blocking)
    );
  }

  if (def.speed) {
    out.add(
      t('item.attackSpeed', { value: def.speed }),
      'white',
      false,
      statDelta(def.speed, worn?.def.speed)
    );
  }

  wingLines(out, def, level);
  helperLines(out, def);
  jewelLines(out, def);
  consumableLines(out, def, item);

  // The Fenrir materials count toward their mix: Splinter of Armor and Bless of Guardian
  // 20, Claw of Beast 10 (ZzzInventory.cpp:4576-4584).
  const pieces = def.group === ItemGroup.Helper ? FENRIR_MATERIAL_PIECES[def.index] : undefined;
  if (pieces) out.add(t('item.pieces', { count: item.durability ?? 0, max: pieces }));

  // Durability: gear, wings and helpers show current/max.
  const hasDurability =
    !pieces &&
    (def.durability || def.magicDur) &&
    (def.group <= ItemGroup.Boots || def.group === ItemGroup.Helper || isWing(def));
  if (hasDurability) {
    out.add(
      t('item.durability', {
        current: item.durability ?? stats.maxDurability,
        max: stats.maxDurability,
      }),
      'white',
      false,
      statDelta(stats.maxDurability, worn?.maxDurability)
    );
  }

  def.resistances.forEach((value, index) => {
    if (value) {
      out.add(
        t('item.resistance', {
          element: t(RESISTANCE_NAME_KEYS[index]),
          value: level + 1,
        })
      );
    }
  });

  requirementLine(out, 'common.level', stats.reqLvl, hero.level, worn?.reqLvl);
  requirementLine(out, 'stat.strength', stats.reqStr, hero.str, worn?.reqStr);
  requirementLine(out, 'stat.agility', stats.reqAgi, hero.agi, worn?.reqAgi);
  requirementLine(out, 'stat.vitality', stats.reqVit, hero.vit, worn?.reqVit);
  requirementLine(out, 'stat.energy', stats.reqEne, hero.ene, worn?.reqEne);
  requirementLine(out, 'stat.command', stats.reqCmd, hero.cmd, worn?.reqCmd);

  if (def.group !== ItemGroup.Potion && !isJewel(def)) {
    classLines(out, def, hero);
  }

  if (def.group === ItemGroup.Boots && level >= 5) {
    out.blank();
    out.add(t('item.defenseRateUp'), 'blue', true);
  }
  if (def.group === ItemGroup.Gloves && level >= 5) {
    out.blank();
    out.add(t('item.attackRateUp'), 'blue', true);
  }

  if (isStaff(def)) {
    out.blank();
    const label = t(
      isSummonerBook(def) ? 'item.curseIncrease' : 'item.wizardryIncrease'
    );
    out.add(
      t('item.percentBonus', { label, value: stats.magicPower }),
      'blue',
      true,
      statDelta(stats.magicPower, worn?.magicPower)
    );
  } else if (isScepter(def) && def.magicPower) {
    out.blank();
    out.add(
      t('item.petAttackIncrease', { value: stats.magicPower }),
      'blue',
      true,
      statDelta(stats.magicPower, worn?.magicPower)
    );
  }

  // Options (`RenderDefaultOptionText`), skill, luck, excellent.
  const optionLevel = item.optionLevel ?? 0;
  const excellentFlags = isFenrir(def) ? 0 : item.excellentFlags ?? 0;
  const wingOpts = wingOptions(item);
  const hasOptions =
    optionLevel > 0 || item.luck || item.hasSkill || excellentFlags > 0 || wingOpts.length > 0;

  if (hasOptions) out.blank();

  guardianOptionLines(out, item);
  harmonyLines(out, item, def, level);
  ancientBonusLines(out, def, item);

  // `CalcWingOptions` fills the specials before the skill and luck (ZzzInfomation.cpp:1078).
  for (const { option, value } of wingOpts) out.add(t(WING_OPTION_TEXT[option], { value }), 'blue');

  if (item.hasSkill) {
    const skill = skillDisplayName(def.skill);
    out.add(skill ? t('item.skillNamed', { skill }) : t('item.skill'), 'blue');
  }

  if (item.luck) {
    out.add(t('item.luckSoul'), 'blue');
    out.add(t('item.luckCritical'), 'blue');
  }

  for (const { kind, value } of optionSpecials(item, def)) {
    // Loch's Feather to the Invisibility Cloak print no HP recovery (ZzzInventory.cpp:1897).
    if (kind === 'life' && def.group === ItemGroup.Helper && def.index >= 14 && def.index <= 18) continue;
    out.add(t(OPTION_TEXT[kind], { value }), 'blue');
    // The Magic Gladiator swords also name it as wizardry (ZzzInventory.cpp:5119-5131).
    if (kind === 'damage' && def.group === ItemGroup.Sword && MG_SWORDS.includes(def.index)) {
      out.add(t('item.additionalWizardry', { value }), 'blue');
    }
  }

  if (excellentFlags > 0) {
    excellentLines(out, def, excellentFlags);
  }

  fenrirLines(out, def, item, hero);
}

/** `GetSpecialOptionText` for the wing options (ZzzInventory.cpp:1975-2023). */
const WING_OPTION_TEXT: Readonly<Record<WingOption, TextKey>> = {
  maxHp: 'item.wing.maxHp',
  maxMana: 'item.wing.maxMana',
  ignoreDefense: 'item.wing.ignoreDefense',
  maxAg: 'item.wing.maxAg',
  command: 'item.setOpt.command',
  returnDamage: 'item.wing.returnDamage',
  fullLife: 'item.wing.fullLife',
  fullMana: 'item.wing.fullMana',
};

/** The option level's line by its `AT_*` kind (`GetSpecialOptionText`, ZzzInventory.cpp:1883-2010). */
const OPTION_TEXT: Readonly<Record<OptionSpecial, TextKey>> = {
  life: 'item.wing.hpRecovery',
  damage: 'item.additionalDamage',
  wizardry: 'item.additionalWizardry',
  curse: 'item.additionalCurse',
  defense: 'item.additionalDefense',
  defenseRate: 'item.additionalDefenseRate',
  maxMana: 'item.maxManaPercent',
  maxAg: 'item.maxAgPercent',
  absorb: 'item.absorbAdditional',
  agMax: 'item.wing.maxAg',
  attackSpeed: 'item.attackSpeedUp',
};

/** `ITEM_DARK_REIGN_BLADE`, `ITEM_EXPLOSION_BLADE`, `ITEM_SWORD_DANCER`, `ITEM_IMPERIAL_SWORD`, `ITEM_RUNE_BLADE`. */
const MG_SWORDS: readonly number[] = [21, 23, 25, 28, 31];

/** `AT_SKILL_PLASMA_STORM_FENRIR`. */
const PLASMA_STORM = 76;

/** The Horn of Fenrir's own block (ZzzInventory.cpp:5160-5222). */
function fenrirLines(out: Lines, def: ItemDef, item: Item, hero: HeroStats) {
  if (!isFenrir(def)) return;
  const flags = item.excellentFlags ?? 0;
  out.add(t('item.fenrir.skill', { mana: skillMana(PLASMA_STORM) }), 'blue');
  if (flags === 0x01 || flags === 0x02) {
    out.add(t(flags === 0x01 ? 'item.fenrir.finalDamage' : 'item.fenrir.absorbFinal', { value: 10 }), 'blue');
    out.add(t('item.increaseSpeed'), 'blue');
  } else if (flags === 0x04) {
    out.add(t('item.fenrir.life', { value: Math.trunc(hero.level / 2) }), 'blue');
    out.add(t('item.fenrir.mana', { value: Math.trunc(hero.level / 2) }), 'blue');
    out.add(t('item.fenrir.attack', { value: Math.trunc(hero.level / 12) }), 'blue');
    out.add(t('item.fenrir.wizardry', { value: Math.trunc(hero.level / 25) }), 'blue');
    out.blank();
    out.add(t('item.fenrir.golden'), 'green');
    out.add(t('item.fenrir.heroes'), 'green');
  }
  out.blank();
  out.add(t('item.fenrir.summon'), 'yellow');
  if (flags === 0) out.add(t('item.fenrir.upgrade'), 'yellow');
}

/** `SET_OPTION_*` (1 str, 2 agi, 3 ene, 4 vit) -> the +5 / +10 bonus line (`GetDefaultOptionText`). */
const ANCIENT_BONUS_TEXT: Readonly<Record<number, TextKey>> = {
  1: 'item.setOpt.strength',
  2: 'item.setOpt.agility',
  3: 'item.setOpt.energy',
  4: 'item.setOpt.stamina',
};

/** Rings and pendants also name their attribute damage (CSItemOption.cpp:670-676). */
function hasAttributeDamage(def: ItemDef): boolean {
  if (def.group !== ItemGroup.Helper) return false;
  return (def.index >= 8 && def.index <= 9) || (def.index >= 12 && def.index <= 13) || (def.index >= 21 && def.index <= 28);
}

/** `RenderDefaultOptionText` (CSItemOption.cpp:664-680): an ancient piece's stat bonus. */
function ancientBonusLines(out: Lines, def: ItemDef, item: Item) {
  const bonus = item.ancientBonusLevel ?? 0;
  const key = ANCIENT_BONUS_TEXT[def.attType];
  if (bonus <= 0 || !key) return;
  out.add(t(key, { value: bonus * 5 }), 'blue');
  if (hasAttributeDamage(def)) out.add(t('item.attributeDamage'), 'blue');
}

/**
 * What the tooltip reads beyond the hero's stats: the worn items and whether this item is outside the
 * bag (`bThisisEquippedItem`) for the set block, and the hero's maximums for the socket values.
 */
export type TooltipExtras = {
  worn: readonly (Item | null)[];
  equipped: boolean;
  maxLife?: number;
  maxMana?: number;
  masterLevel?: number;
};

/** `getExplainText` (CSItemOption.cpp:375-445) by set option number; no S6 set uses the class masteries past 23. */
const SET_OPTION_TEXT: readonly TextKey[] = [
  'item.setOpt.strength',
  'item.setOpt.agility',
  'item.setOpt.energy',
  'item.setOpt.stamina',
  'item.setOpt.command',
  'item.setOpt.minDamage',
  'item.setOpt.maxDamage',
  'item.setOpt.wizardry',
  'item.setOpt.damage',
  'item.setOpt.attackRate',
  'item.setOpt.defense',
  'item.setOpt.maxLife',
  'item.setOpt.maxMana',
  'item.setOpt.maxAg',
  'item.setOpt.agRate',
  'item.setOpt.criticalRate',
  'item.setOpt.criticalDamage',
  'item.setOpt.excellentRate',
  'item.setOpt.excellentDamage',
  'item.setOpt.skillAttack',
  'item.setOpt.doubleDamage',
  'item.setOpt.ignoreDefense',
  'item.setOpt.shieldDefense',
  'item.setOpt.twoHanded',
];

/**
 * `RenderSetOptionListInItem` (CSItemOption.cpp:1052-1095): the header, then the options of the set
 * while two or more pieces are worn, lit as `RenderSetOptionList` lights them (grey in the bag).
 */
function setOptionBlock(out: Lines, item: Item, hero: HeroStats, ancient?: TooltipExtras) {
  const set = ancientSetOf(item);
  if (!set) return;
  out.blank();
  out.add(t('item.setInfo'), 'yellow');
  out.blank();
  const pieces = ancient ? wornSetPieces(set, ancient.worn, withWornStats(hero, ancient.worn)) : 0;
  for (const line of setOptionLines(set, pieces)) {
    const key = SET_OPTION_TEXT[line.option];
    if (!key) continue;
    const lit = ancient?.equipped && line.active;
    const color = !lit ? 'gray' : line.kind === 'full' ? 'yellow' : line.kind === 'ext' ? 'green' : 'blue';
    out.add(t(key, { value: line.value }), color);
  }
}

/** `GetItemAddOtioninfoText` (ItemAddOptioninfo.cpp:58-99) by option number. */
const ADD_OPTION_TEXT: Readonly<Record<number, TextKey>> = {
  1: 'item.opt380.attackRate',
  2: 'item.opt380.damage',
  3: 'item.opt380.defenseRate',
  4: 'item.opt380.defense',
  5: 'item.opt380.maxHp',
  6: 'item.opt380.maxSd',
  7: 'item.opt380.sdAuto',
  8: 'item.opt380.sdRate',
};

/** The 380 option block (ZzzInventory.cpp:5008-5025). */
function guardianOptionLines(out: Lines, item: Item) {
  const options = hasGuardianOption(item) ? itemOptionTables()?.addOptions[item.group * 512 + item.num] : undefined;
  if (!options) return;
  out.blank();
  for (const [option, value] of options) {
    const key = ADD_OPTION_TEXT[option];
    if (key) out.add(t(key, { value }), 'redPurple', true);
  }
  out.blank();
}

/** `GetItemType` (UIJewelHarmony.cpp:133-152): 0 weapons, 1 staffs, 2 shields and armour. */
function harmonyKind(def: ItemDef): number | null {
  if (def.group <= ItemGroup.Bow) return 0;
  if (def.group === ItemGroup.Staff) return 1;
  return def.group >= ItemGroup.Shield && def.group <= ItemGroup.Boots ? 2 : null;
}

/**
 * The Jewel of Harmony line (ZzzInventory.cpp:5037-5062): yellow once the item's level reaches the
 * option's, grey before. Weapons take options 1-10, staffs and armour 1-8 (`IsHarmonyJewelOption`).
 */
function harmonyLines(out: Lines, item: Item, def: ItemDef, level: number) {
  const harmony = harmonyOf(item);
  const kind = harmonyKind(def);
  if (!harmony || kind === null || harmony.option > (kind === 0 ? 10 : 8)) return;
  const entry = itemOptionTables()?.harmony[kind]?.[harmony.option - 1];
  if (!entry) return;
  out.blank();
  const percent = kind === 2 && harmony.option === 7 ? '%' : '';
  out.add(`${entry.name} +${entry.values[harmony.level] ?? 0}${percent}`, level >= harmony.level ? 'yellow' : 'gray', true);
  out.blank();
}

/** `GlobalText[2640 + category - 1]`: a socket option's element. */
const SOCKET_ELEMENT: readonly TextKey[] = [
  'element.fire',
  'element.water',
  'element.ice',
  'element.wind',
  'element.lightning',
  'element.earth',
  'item.socketUnique',
];

/** The hero maximums a socket value reads. */
type SocketMaxima = Pick<TooltipExtras, 'maxLife' | 'maxMana' | 'masterLevel'>;

/** `CalcSocketOptionValue` / `CalcSocketOptionValueText` (SocketSystem.cpp:141-198). */
function socketValue(option: SocketOption, value: number, hero: HeroStats, extras?: SocketMaxima): string {
  const amount = socketOptionValue(option.type, value, { ...extras, level: hero.level });
  return option.type === 2 ? `+${amount}%` : `+${amount}`;
}

/** `CreateSocketOptionText` (SocketSystem.cpp:201-213): "element(name value)", null when the tables lack it. */
export function socketOptionText(socket: { seed: number; level: number }, hero: HeroStats, extras?: SocketMaxima): string | null {
  const info = itemOptionTables()?.sockets[0][socket.seed];
  if (!info) return null;
  const element = SOCKET_ELEMENT[info.category - 1];
  return `${element ? t(element) : ''}(${info.name} ${socketValue(info, info.values[socket.level - 1] ?? 0, hero, extras)})`;
}

/** `AttachToolTipForSocketItem` (SocketSystem.cpp:218-266): each socket, then the bonus option. */
function socketLines(out: Lines, item: Item, hero: HeroStats, extras?: TooltipExtras) {
  const sockets = socketsOf(item);
  const tables = itemOptionTables();
  if (!sockets.length || !tables) return;
  out.blank();
  out.add(t('item.socketInfo'), 'purple');
  out.blank();
  sockets.forEach((socket, i) => {
    const option = socket ? socketOptionText(socket, hero, extras) : null;
    if (!option) {
      out.add(t('item.socketSlot', { index: i + 1, option: t('item.socketEmpty') }), 'gray');
      return;
    }
    out.add(t('item.socketSlot', { index: i + 1, option }), 'blue');
  });
  const bonus = socketBonusOf(item);
  const info = bonus === null ? null : tables.sockets[1][bonus];
  if (!info || info.values[0] <= 0) return;
  out.blank();
  out.add(t('item.socketBonus'), 'purple');
  out.blank();
  out.add(`${info.name} ${socketValue(info, info.values[0], hero, extras)}`, 'blue');
}

function trimBlanks(lines: TooltipLine[]): TooltipLine[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].blank) start++;
  while (end > start && lines[end - 1].blank) end--;
  return lines.slice(start, end);
}
