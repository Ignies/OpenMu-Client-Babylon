/** Spanish text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'No puedes tirar ese objeto',
  'notify.carryingTooMuchZen': 'Llevas demasiado Zen',
  'notify.cannotPickUp': 'No puedes recoger eso',
  'drop.skill': '+Habilidad',
  'drop.option': '+Opción',
  'drop.luck': '+Suerte',
  'drop.knightSkill': 'Habilidad exclusiva del caballero',
} satisfies Partial<Record<keyof typeof en, string>>;
