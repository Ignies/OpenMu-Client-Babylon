/** id text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Item itu tidak dapat dibuang',
  'notify.carryingTooMuchZen': 'Zen yang kamu bawa terlalu banyak',
  'notify.cannotPickUp': 'Tidak dapat memungut itu',
  'drop.skill': '+Skill',
  'drop.option': '+Opsi',
  'drop.luck': '+Luck',
  'drop.knightSkill': 'Skill khusus Knight',
} satisfies Partial<Record<keyof typeof en, string>>;
