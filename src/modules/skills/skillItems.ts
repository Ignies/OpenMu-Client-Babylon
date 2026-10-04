import type { Item } from '../../ecs/world';
import { classCanUse, learnableSkill, type HeroStats, type ItemStats } from '@/controllers/item_rules';
import { skillDisplayName } from '@/controllers/assets';
import { t } from '../../i18n';

/**
 * Why `hero` cannot learn from `item` right now, or null when the use may
 * go to the server. `stats` are the item's effective requirements
 * (`itemStats(item)`, which already folds the skill's own level / energy
 * in); `known` are the skill numbers on the hero's list.
 *
 * The original checks level, energy and strength in silence
 * (NewUIMyInventory.cpp:1899) and leaves class and "already learned" to the
 * server's refusal; every reason is spelled out here instead, in the order
 * the tooltip lists the requirements.
 */
export function learnSkillError(
  item: Item,
  stats: ItemStats,
  hero: HeroStats,
  known: readonly number[]
): string | null {
  const number = learnableSkill(item);
  if (number === undefined) return t('skills.teachesNothing');

  const name = skillDisplayName(number) ?? t('skills.thisSkill');

  if (!classCanUse(stats.def, hero)) {
    return t('skills.classCannotLearn', { name });
  }
  if (known.includes(number)) return t('skills.alreadyKnown', { name });

  const short = (label: string, required: number, have: number) =>
    t('skills.needMore', { label, required, name, more: required - have });

  if (hero.level < stats.reqLvl) return short('Level', stats.reqLvl, hero.level);
  if (hero.str < stats.reqStr) return short('Strength', stats.reqStr, hero.str);
  if (hero.agi < stats.reqAgi) return short('Agility', stats.reqAgi, hero.agi);
  if (hero.vit < stats.reqVit) return short('Vitality', stats.reqVit, hero.vit);
  if (hero.ene < stats.reqEne) return short('Energy', stats.reqEne, hero.ene);
  if (hero.cmd < stats.reqCmd) return short('Command', stats.reqCmd, hero.cmd);

  return null;
}
