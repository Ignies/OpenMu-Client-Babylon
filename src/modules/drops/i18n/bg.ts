/** Bulgarian text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Не можеш да пуснеш този предмет',
  'notify.carryingTooMuchZen': 'Носиш твърде много Zen',
  'notify.cannotPickUp': 'Това не може да се вдигне',
  'drop.skill': '+Умение',
  'drop.option': '+Опция',
  'drop.luck': '+Късмет',
  'drop.knightSkill': 'Умение само за рицар',
} satisfies Partial<Record<keyof typeof en, string>>;
