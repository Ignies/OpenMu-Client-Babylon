/** Russian text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Этот предмет выбросить нельзя',
  'notify.carryingTooMuchZen': 'Вы несёте слишком много Zen',
  'notify.cannotPickUp': 'Это нельзя подобрать',
  'drop.skill': '+Навык',
  'drop.option': '+Опция',
  'drop.luck': '+Удача',
  'drop.knightSkill': 'Навык рыцаря',
} satisfies Partial<Record<keyof typeof en, string>>;
