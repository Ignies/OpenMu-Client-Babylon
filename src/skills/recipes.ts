/**
 * Pure data shared by the skill entries: the buff table (icon, kind, name,
 * best-effort duration) keyed by the wire effect id, and the skill delay
 * table keyed by skill number. No state, no imports from entries.
 *
 * Buff ids: OpenMU's `MagicEffectNumber` is the original client's
 * `eBuffState` (`_enum.h`), which is also the record index of
 * `Data/Local/BuffEffect.bmd` (127 BUX-encrypted `_BUFFINFO` records,
 * `w_BuffScriptLoader.cpp`) and the icon index of `newui_statusicon*.jpg`
 * (`CNewUIBuffWindow::RenderBuffIcon`). `kind` is that file's
 * `s_BuffClassType` (0 buff / 1 debuff); the names are the enum's, since the
 * shipped BMD is Japanese.
 *
 * Delays: `SkillAttribute[].Delay` from `Data/Local/Skill.bmd` (600 × 80-byte
 * BUX records, `Delay` at offset 44, milliseconds) — every non-zero entry.
 */

import { MAGIC_EFFECTS } from '../common/magicEffects';
import { t } from '../i18n';

export type BuffKind = 'buff' | 'debuff';

export interface BuffRecipe {
  name: string;
  kind: BuffKind;
  /**
   * Seconds the effect lasts, from the hero's total energy, when the client
   * can know it (the original prints the same formula in the skill tooltip).
   * Missing = unknown: the bar shows the icon without a countdown.
   */
  durationSeconds?: (energy: number) => number;
}

/** `eBuffClass_DeBuff` rows of BuffEffect.bmd (s_BuffClassType == 1). */
const DEBUFF_IDS: ReadonlySet<number> = new Set([
  55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 72, 73, 74, 75, 76, 77, 83, 84,
  85, 86, 107, 108, 120, 132,
]);

const NAMES: Record<number, string> = {
  1: 'Greater Damage',
  2: 'Greater Defense',
  3: 'Elf Soldier Buff',
  4: 'Soul Barrier',
  5: 'Critical Damage Increase',
  6: 'Infinity Arrow',
  7: 'AG Recovery Speed',
  8: 'Greater Fortitude',
  9: 'Elite Mana Potion',
  10: 'Potion of Bless',
  11: 'Potion of Soul',
  12: 'Remove Magic',
  13: 'Castle Gate Open',
  14: 'Castle Regiment Defense',
  15: 'Castle Regiment Attack 1',
  16: 'Castle Regiment Attack 2',
  17: 'Castle Regiment Attack 3',
  18: 'Transparency',
  19: 'Brand of Skill',
  20: 'Castle Crown',
  28: 'GM Effect',
  29: 'PC Room Seal 1',
  30: 'PC Room Seal 2',
  31: 'PC Room Seal 3',
  32: 'Cursed Temple Quickness',
  33: 'Cursed Temple Sublimation',
  34: 'Cursed Temple Protection',
  35: "Jack O'Lantern Blessing",
  36: "Jack O'Lantern Wrath",
  37: "Jack O'Lantern Cry",
  38: "Jack O'Lantern Food",
  39: "Jack O'Lantern Drink",
  40: 'Seal of Ascension',
  41: 'Seal of Wealth',
  42: 'Seal of Sustenance',
  43: 'Seal of Mobility',
  44: 'Scroll of Quickness',
  45: 'Scroll of Defense',
  46: 'Scroll of Wrath',
  47: 'Scroll of Wizardry',
  48: 'Scroll of Health',
  49: 'Scroll of Mana',
  50: 'Elixir of Strength',
  51: 'Elixir of Agility',
  52: 'Elixir of Vitality',
  53: 'Elixir of Energy',
  54: 'Elixir of Command',
  55: 'Poison',
  56: 'Freeze',
  57: 'Ice Arrow',
  58: 'Defense Reduction',
  59: 'Attack Reduction',
  60: 'Magic Power Reduction',
  61: 'Stun',
  62: 'Invincible (Magic)',
  63: 'Immune to Magic',
  64: 'Immune to Physical',
  65: 'Cursed Temple Restraint',
  66: 'Crywolf Protection 1',
  67: 'Crywolf Protection 2',
  68: 'Crywolf Protection 3',
  69: 'Crywolf Protection 4',
  70: 'Crywolf Protection 5',
  71: 'Damage Reflection',
  72: 'Sleep',
  73: 'Blind',
  74: 'Neil DOT',
  75: 'Sahamutt DOT',
  76: 'Weakness',
  77: 'Innovation',
  78: 'Cherry Blossom Liquor',
  79: 'Cherry Blossom Rice Cake',
  80: 'Cherry Blossom Petal',
  81: 'Berserker',
  82: 'Expansion of Wizardry',
  83: 'Flame Strike',
  84: 'Gigantic Storm',
  85: 'Lightning Shock',
  86: 'Blow of Destruction',
  87: 'Seal of HP Recovery',
  88: 'Seal of MP Recovery',
  89: 'Scroll of Battle',
  90: 'Scroll of Strengthener',
  91: 'Blessing of Christmas',
  92: 'Cure of Santa',
  93: 'Safeguard of Santa',
  94: 'Strength of Santa',
  95: 'Defense of Santa',
  96: 'Quickness of Santa',
  97: 'Luck of Santa',
  98: 'Duel Watch',
  99: 'Guard Charm',
  100: 'Item Guard Charm',
  101: 'Master Seal of Ascension',
  102: 'Master Seal of Wealth',
  103: 'Honor of Gladiator',
  105: 'Doppelganger Ascension',
  107: 'Stamina Penalty 1',
  108: 'Stamina Penalty 2',
  112: 'Party Exp Bonus',
  113: 'AG Addition',
  114: 'SD Addition',
  119: 'New Seal of Wealth',
  120: 'Discharge Stamina',
  121: 'Scroll of Healing',
  122: 'Hawk Figurine',
  123: 'Goat Figurine',
  124: 'Oak Charm',
  125: 'Maple Charm',
  126: 'Golden Oak Charm',
  127: 'Golden Maple Charm',
  128: 'Worn Horseshoe',
  129: 'Ignore Defense',
  130: 'Increase Health',
  131: 'Increase Block',
  132: 'Decrease Block',
  134: 'Iron Defense',
  135: 'Greater Fortitude Proficiency',
  136: 'Greater Fortitude Mastery',
  137: 'Death Stab Strengthener',
  138: 'Wizardry Enhance Strengthener',
  139: 'Wizardry Enhance Mastery',
  140: 'Soul Barrier Mastery',
  141: 'Ice Arrow Mastery',
  142: 'Bless',
  143: 'Infinity Arrow Strengthener',
  144: 'Blind Strengthener',
  145: 'Drain Life Strengthener',
  146: 'Ice Storm Strengthener',
  147: 'Earth Prison',
  148: 'Critical Damage Increase Mastery',
  149: 'Critical Damage Increase Extended',
  150: 'Sword Power Improved',
  151: 'Sword Power Enhanced',
  152: 'Sword Power Mastered',
  153: 'Increase Block Power Up',
  154: 'Increase Block Mastery',
  155: 'Increase Health Strengthener',
  157: 'Dragon Roar Strengthener',
  158: 'Chain Drive Strengthener',
  159: 'Poison Arrow',
  160: 'Poison Arrow Strengthener',
  161: 'Bless Strengthener',
  162: 'Lesser Damage Strengthener',
  163: 'Lesser Defense Strengthener',
  164: 'Fire Slash Strengthener',
  165: 'Iron Defense Strengthener',
  166: 'Blood Howling',
  167: 'Blood Howling Strengthener',
  200: 'Shield Skill',
  201: 'Alcohol',
};

/** `RenderSkillInfo` GlobalText 881: Soul Barrier lasts 60 + Energy/40 s. */
const soulBarrierSeconds = (energy: number) => 60 + energy / 40;

const DURATIONS: Record<number, (energy: number) => number> = {
  4: soulBarrierSeconds,
  140: soulBarrierSeconds,
};

export function buffRecipe(effectId: number): BuffRecipe {
  // The catalogue covers the effects the client itself names; the rest of
  // BuffEffect.bmd is only in NAMES and stays English until the pack is read.
  const key = MAGIC_EFFECTS[effectId]?.nameKey;

  return {
    name: key ? t(key) : (NAMES[effectId] ?? t('buff.unnamed', { number: effectId })),
    kind: DEBUFF_IDS.has(effectId) ? 'debuff' : 'buff',
    durationSeconds: DURATIONS[effectId],
  };
}

/** Icon cell size of `newui_statusicon*.jpg` (BUFF_IMG_WIDTH / HEIGHT). */
export const BUFF_ICON_WIDTH = 20;
export const BUFF_ICON_HEIGHT = 28;
/** Icons per atlas row (the atlases are 200 px wide). */
const BUFF_ICONS_PER_ROW = 10;
/** Icons per atlas (200 × 224 px = 10 × 8 cells). */
const BUFF_ICONS_PER_ATLAS = 80;
/** First id of the second atlas (`eBuff_Berserker`). */
const BUFF_ATLAS2_FIRST = 81;

const BUFF_ATLASES = [
  'newui_statusicon.OZJ',
  'newui_statusicon2.OZJ',
  'newui_statusicon3.OZJ',
];

/**
 * Where an effect's icon sits: ids below 81 index the first atlas from 0,
 * the rest index the second from 81 (`RenderBuffIcon`); the third atlas,
 * which this Data copy ships, continues the sequence.
 */
export function buffIconCell(
  effectId: number
): { file: string; x: number; y: number } | null {
  if (effectId <= 0) return null;
  let index: number;
  let atlas: number;
  if (effectId < BUFF_ATLAS2_FIRST) {
    index = effectId - 1;
    atlas = 0;
  } else {
    const rest = effectId - BUFF_ATLAS2_FIRST;
    atlas = 1 + Math.floor(rest / BUFF_ICONS_PER_ATLAS);
    index = rest % BUFF_ICONS_PER_ATLAS;
  }
  const file = BUFF_ATLASES[atlas];
  if (!file) return null;
  return {
    file,
    x: (index % BUFF_ICONS_PER_ROW) * BUFF_ICON_WIDTH,
    y: Math.floor(index / BUFF_ICONS_PER_ROW) * BUFF_ICON_HEIGHT,
  };
}

/** Skill number → re-use delay in milliseconds (Skill.bmd `Delay`). */
export const SKILL_DELAY_MS: Readonly<Record<number, number>> = {
  62: 10000, // Earthshake
  63: 30000, // Summon (Dark Lord)
  65: 5000, // Electric Spike
  76: 1500, // Plasma Storm
  77: 200, // Infinity Arrow
  217: 5000, // Damage Reflection
  218: 5000, // Berserker
  221: 4000, // Weakness
  222: 4000, // Innovation
  223: 4000, // Explosion
  224: 4000, // Requiem
  225: 4000, // Pollution
  262: 700, // Chain Drive
  264: 700, // Dragon Roar
  265: 3000, // Dragon Slasher
  515: 10000, // Crit DMG Inc PowUp (2)
  516: 10000, // Earthshake Mastery
  517: 10000, // Crit DMG Inc PowUp (3)
  518: 10000, // Fire Scream Strengthener
  519: 10000, // Electric Spark Strengthener
};
