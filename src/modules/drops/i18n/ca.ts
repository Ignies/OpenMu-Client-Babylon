/** ca text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'No pots deixar caure aquest objecte',
  'notify.carryingTooMuchZen': 'Portes massa Zen',
  'notify.cannotPickUp': 'No ho pots recollir',
  'drop.skill': '+Habilitat',
  'drop.option': '+Opció',
  'drop.luck': '+Luck',
  'drop.knightSkill': 'Habilitat exclusiva del cavaller',
} satisfies Partial<Record<keyof typeof en, string>>;
