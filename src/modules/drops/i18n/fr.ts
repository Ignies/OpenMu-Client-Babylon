/** French text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Impossible de jeter cet objet',
  'notify.carryingTooMuchZen': 'Vous portez trop de Zen',
  'notify.cannotPickUp': 'Impossible de ramasser cela',
} satisfies Partial<Record<keyof typeof en, string>>;
