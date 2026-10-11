/** French text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Impossible de jeter cet objet',
  'notify.carryingTooMuchZen': 'Vous portez trop de Zen',
  'notify.cannotPickUp': 'Impossible de ramasser cela',
  'drop.skill': '+Compétence',
  'drop.option': '+Option',
  'drop.luck': '+Chance',
  'drop.knightSkill': 'Compétence propre au chevalier',
} satisfies Partial<Record<keyof typeof en, string>>;
