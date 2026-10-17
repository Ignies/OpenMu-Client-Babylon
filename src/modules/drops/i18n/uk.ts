/** uk text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Цей предмет не можна викинути',
  'notify.carryingTooMuchZen': 'У вас забагато Zen',
  'notify.cannotPickUp': 'Це не можна підібрати',
} satisfies Partial<Record<keyof typeof en, string>>;
