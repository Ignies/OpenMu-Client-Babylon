/** id text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Item itu tidak dapat dibuang',
  'notify.carryingTooMuchZen': 'Zen yang kamu bawa terlalu banyak',
  'notify.cannotPickUp': 'Tidak dapat memungut itu',
} satisfies Partial<Record<keyof typeof en, string>>;
