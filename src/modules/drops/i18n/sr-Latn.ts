/** sr-Latn text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Taj predmet ne može da se baci',
  'notify.carryingTooMuchZen': 'Nosiš previše Zen',
  'notify.cannotPickUp': 'To ne može da se pokupi',
  'drop.skill': '+Skill',
  'drop.option': '+Option',
  'drop.luck': '+Luck',
  'drop.knightSkill': 'Posebna veština viteza',
} satisfies Partial<Record<keyof typeof en, string>>;
