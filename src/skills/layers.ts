import type { SkillLayer } from './layer';
import { buffsLayer } from './buffs';
import { cooldownsLayer } from './cooldowns';
import { usabilityLayer } from './usability';
import { masterLevelLayer } from './masterLevel';
import { masterTreeLayer } from './masterTree';

/**
 * THE LIST — the only place skill entries are enumerated. Order is update
 * order; an entry that reads another goes after it, with a comment saying so.
 */
export const SKILL_LAYERS: readonly SkillLayer[] = [
  buffsLayer,
  cooldownsLayer,
  usabilityLayer, // reads cooldownsLayer → after it
  masterLevelLayer,
  masterTreeLayer, // reads masterLevelLayer + usabilityLayer → after both
];
