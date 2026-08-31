/**
 * OpenMU MagicEffectNumber (src/GameLogic/MagicEffectNumber.cs): the EffectId
 * carried by MagicEffectStatus (0x07). Names are shown on the buff bar until
 * the original's icon atlas is wired.
 */
import type { TextKey } from '../i18n';

export interface MagicEffectInfo {
  nameKey: TextKey;
  short: string;
  kind: 'buff' | 'debuff';
}

export const MAGIC_EFFECTS: Record<number, MagicEffectInfo> = {
  1: { nameKey: 'buff.greaterDamage', short: 'DMG', kind: 'buff' },
  2: { nameKey: 'buff.greaterDefense', short: 'DEF', kind: 'buff' },
  3: { nameKey: 'buff.elfSoldier', short: 'ELF', kind: 'buff' },
  4: { nameKey: 'buff.soulBarrier', short: 'SB', kind: 'buff' },
  5: { nameKey: 'buff.criticalDamage', short: 'CRIT', kind: 'buff' },
  6: { nameKey: 'buff.infiniteArrow', short: 'ARR', kind: 'buff' },
  7: { nameKey: 'buff.agRecovery', short: 'AG+', kind: 'buff' },
  8: { nameKey: 'buff.greaterFortitude', short: 'HP+', kind: 'buff' },
  9: { nameKey: 'buff.eliteManaPotion', short: 'MP+', kind: 'buff' },
  10: { nameKey: 'buff.potionOfBless', short: 'BLS', kind: 'buff' },
  11: { nameKey: 'buff.potionOfSoul', short: 'SOUL', kind: 'buff' },
  129: { nameKey: 'buff.ignoreDefense', short: 'IGN', kind: 'buff' },
  130: { nameKey: 'buff.increaseHealth', short: 'HP+', kind: 'buff' },
  131: { nameKey: 'buff.increaseBlock', short: 'BLK', kind: 'buff' },
  132: { nameKey: 'buff.decreaseBlock', short: 'BLK-', kind: 'debuff' },
  135: { nameKey: 'buff.fortitudeProficiency', short: 'HP+', kind: 'buff' },
  138: { nameKey: 'buff.wizardryStrengthener', short: 'WIZ', kind: 'buff' },
  139: { nameKey: 'buff.wizardryMastery', short: 'WIZ', kind: 'buff' },
  148: { nameKey: 'buff.criticalMastery', short: 'CRIT', kind: 'buff' },
  153: { nameKey: 'buff.blockPowerUp', short: 'BLK', kind: 'buff' },
  154: { nameKey: 'buff.blockMastery', short: 'BLK', kind: 'buff' },
  155: { nameKey: 'buff.healthStrengthener', short: 'HP+', kind: 'buff' },
  200: { nameKey: 'buff.shieldSkill', short: 'SHLD', kind: 'buff' },
  201: { nameKey: 'buff.alcohol', short: 'ALE', kind: 'buff' },
};

/** Skill number → effect it applies (for MagicEffectCancelled, which names the skill). */
export const SKILL_TO_EFFECT: Record<number, number> = {
  16: 4, // Soul Barrier
  18: 2, // Defense
  27: 2, // Greater Defense
  28: 1, // Greater Damage
  35: 6, // Infinity Arrow
  30: 8, // Greater Fortitude
  43: 7, // Swell Life? (AG recovery)
  233: 130, // Increase Health
  234: 131, // Increase Block
  232: 129, // Ignore Defense
};
