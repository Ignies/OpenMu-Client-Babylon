/** Romanian text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Nu poți arunca acel obiect',
  'notify.carryingTooMuchZen': 'Duci prea mult Zen',
  'notify.cannotPickUp': 'Nu poți ridica asta',
} satisfies Partial<Record<keyof typeof en, string>>;
