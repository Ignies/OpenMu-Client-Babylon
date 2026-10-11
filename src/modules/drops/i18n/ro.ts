/** Romanian text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Nu poți arunca acel obiect',
  'notify.carryingTooMuchZen': 'Duci prea mult Zen',
  'notify.cannotPickUp': 'Nu poți ridica asta',
  'drop.skill': '+Abilitate',
  'drop.option': '+Opțiune',
  'drop.luck': '+Noroc',
  'drop.knightSkill': 'Abilitate exclusivă a cavalerului',
} satisfies Partial<Record<keyof typeof en, string>>;
