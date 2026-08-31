import { t, type TextKey } from '../i18n';
import type { Item } from '../ecs/world';
import {
  ItemGroup,
  classCanUse,
  isArmorPart,
  isCapeOfFighter,
  isCapeOfLord,
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
  isWing,
  itemStats,
  type HeroStats,
  type ItemDef,
  type ItemStats,
} from './itemStats';
import { learnableSkill } from './skillItems';
import { skillDefinition } from './skillsDatabase';

/**
 * `RenderItemInfo` (ZzzInventory.cpp:2091) as data: the tooltip is a list
 * of coloured lines, blank lines being half-height spacers, drawn by
 * `RenderTipTextList`. Only the paths the clone can reach are ported — the
 * generic equipment block, wings, jewels and the option/excellent lines;
 * event items and pets fall back to their name.
 *
 * `GlobalText` is not available here (Text.bmd is encoded), so the English
 * strings are written out inline.
 */

/** `TEXT_COLOR_*` (_define.h:219) as the tooltip renders them. */
export type TooltipColor =
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

export type TooltipLine = {
  text: string;
  color: TooltipColor;
  bold: boolean;
  /** A `"\n"` entry: half a line of space. */
  blank?: true;
};

export type ItemTooltipData = {
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

  add(text: string, color: TooltipColor = 'white', bold = false) {
    this.list.push({ text, color, bold });
  }

  blank() {
    // The original never stacks two spacers back to back.
    if (this.list.at(-1)?.blank) return;
    this.list.push({ text: '', color: 'white', bold: false, blank: true });
  }
}

/** The first block of `RenderItemInfo`: which colour the name line takes. */
function nameColor(item: Item, def: ItemDef, level: number): TooltipColor {
  const optionLevel = item.optionLevel ?? 0;

  if (isJewel(def)) return 'yellow';
  if (item.isAncient) return 'greenBlue';
  if ((item.socketCount ?? 0) > 0) return 'violet';
  if (isWing(def)) {
    if (level >= 7) return 'yellow';
    return optionLevel > 0 ? 'blue' : 'white';
  }
  if (optionLevel > 0 && item.isExcellent) return 'green';
  if (level >= 7) return 'yellow';
  return optionLevel > 0 ? 'blue' : 'white';
}

function nameLine(item: Item, def: ItemDef, level: number): string {
  let name = def.name;
  if (item.isExcellent) name = t('item.excellentPrefix', { name });
  return level > 0 ? `${name} +${level}` : name;
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
function excellentLines(out: Lines, def: ItemDef, flags: number, heroLevel: number) {
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
    if (flags & 0x10) {
      out.add(
        t('item.exc.perLevel', { kind, value: Math.trunc(heroLevel / 20) }),
        'blue'
      );
    }
    if (flags & 0x08) out.add(t('item.exc.percent', { kind }), 'blue');
    if (flags & 0x04) out.add(t('item.exc.speed'), 'blue');
    if (flags & 0x02) out.add(t('item.exc.life'), 'blue');
    if (flags & 0x01) out.add(t('item.exc.mana'), 'blue');
  }
}

function requirementLine(
  out: Lines,
  labelKey: TextKey,
  required: number,
  have: number
) {
  if (!required) return;
  const label = t(labelKey);
  const line = t('item.required', { label, value: required });
  if (have < required) {
    out.add(line, 'red');
    out.add(t('item.moreNeeded', { value: required - have }), 'red');
  } else {
    out.add(line, 'white');
  }
}

/** `RequireClass` (ZzzInventory.cpp:604). */
function classLines(out: Lines, def: ItemDef, hero: HeroStats) {
  if (def.classes.every(value => value === 1)) return;
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
    out.add(t('item.ableToFly'));
  } else if (isSecondWing(def)) {
    out.add(t('item.increaseDamage', { value: 32 + level }));
    out.add(t('item.absorbDamage', { value: 25 + level * 2 }));
    out.add(t('item.ableToFly'));
  } else if (isThirdWing(def)) {
    out.add(t('item.increaseDamage', { value: 39 + level * 2 }));
    // Cape of Emperor / Overrule absorb less.
    const absorb = def.index === 40 || def.index === 50 ? 24 : 39;
    out.add(t('item.absorbDamage', { value: absorb + level * 2 }));
    out.add(t('item.ableToFly'));
  } else if (isCapeOfLord(def) || isCapeOfFighter(def)) {
    out.add(t('item.increaseDamage', { value: 20 + level * 2 }));
    const absorb = isCapeOfFighter(def) ? 10 + level * 2 : 10 + level;
    out.add(t('item.absorbDamage', { value: absorb }));
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
    return;
  }
  // Orbs, scrolls and crystals name the skill they teach.
  const taught = learnableSkill(item);
  const skill = taught === undefined ? undefined : skillDefinition(taught);
  if (skill) out.add(t('item.learns', { skill: skill.name }), 'blue');
}

/** Builds the tooltip for `item` as seen by `hero`. */
export function buildItemTooltip(
  item: Item,
  hero: HeroStats
): ItemTooltipData | null {
  const stats = itemStats(item);
  if (!stats) return null;

  const { def, level } = stats;
  const out = new Lines();

  out.blank();
  out.add(nameLine(item, def, level), nameColor(item, def, level), true);
  out.blank();

  equipmentLines(out, item, stats, hero);

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
  hero: HeroStats
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
      isExcellent ? 'blue' : 'white'
    );
  }

  if (stats.defense) {
    out.add(
      t('item.defense', { value: stats.defense }),
      isArmorPart(def) && isExcellent ? 'blue' : 'white'
    );
  }

  if (def.blocking) {
    out.add(
      t('item.defenseRate', { value: stats.blocking }),
      isExcellent ? 'blue' : 'white'
    );
  }

  if (def.speed) out.add(t('item.attackSpeed', { value: def.speed }));

  wingLines(out, def, level);
  jewelLines(out, def);
  consumableLines(out, def, item);

  // Durability: gear, wings and helpers show current/max.
  const hasDurability =
    (def.durability || def.magicDur) &&
    (def.group <= ItemGroup.Boots || def.group === ItemGroup.Helper || isWing(def));
  if (hasDurability) {
    out.add(
      t('item.durability', {
        current: item.durability ?? stats.maxDurability,
        max: stats.maxDurability,
      })
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

  requirementLine(out, 'common.level', stats.reqLvl, hero.level);
  requirementLine(out, 'stat.strength', stats.reqStr, hero.str);
  requirementLine(out, 'stat.agility', stats.reqAgi, hero.agi);
  requirementLine(out, 'stat.vitality', stats.reqVit, hero.vit);
  requirementLine(out, 'stat.energy', stats.reqEne, hero.ene);
  requirementLine(out, 'stat.command', stats.reqCmd, hero.cmd);

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
      true
    );
  } else if (isScepter(def) && def.magicPower) {
    out.blank();
    out.add(
      t('item.petAttackIncrease', { value: stats.magicPower }),
      'blue',
      true
    );
  }

  // Options (`RenderDefaultOptionText`), skill, luck, excellent.
  const optionLevel = item.optionLevel ?? 0;
  const excellentFlags = item.excellentFlags ?? (item.isExcellent ? 0 : 0);
  const hasOptions =
    optionLevel > 0 || item.luck || item.hasSkill || excellentFlags > 0;

  if (hasOptions) out.blank();

  if (item.hasSkill) {
    const skill = skillDefinition(def.skill);
    out.add(
      skill ? t('item.skillNamed', { skill: skill.name }) : t('item.skill'),
      'blue'
    );
  }

  if (item.luck) {
    out.add(t('item.luckSoul'), 'blue');
    out.add(t('item.luckCritical'), 'blue');
  }

  if (optionLevel > 0) {
    const bonus = optionLevel * 4;
    if (isStaff(def)) out.add(t('item.additionalWizardry', { value: bonus }), 'blue');
    else if (isWeapon(def)) out.add(t('item.additionalDamage', { value: bonus }), 'blue');
    else out.add(t('item.additionalDefense', { value: bonus }), 'blue');
  }

  if (excellentFlags > 0) {
    excellentLines(out, def, excellentFlags, hero.level);
  }

  if (item.isAncient) {
    out.blank();
    const bonus = item.ancientBonusLevel ?? 0;
    out.add(
      bonus > 0
        ? t('item.ancientBonus', { value: bonus * 5 })
        : t('item.ancient'),
      'greenBlue'
    );
  }
}

function trimBlanks(lines: TooltipLine[]): TooltipLine[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].blank) start++;
  while (end > start && lines[end - 1].blank) end--;
  return lines.slice(start, end);
}
