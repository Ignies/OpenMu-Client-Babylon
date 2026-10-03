/** Polish text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Nie można wyrzucić tego przedmiotu',
  'notify.carryingTooMuchZen': 'Masz przy sobie za dużo Zen',
  'notify.cannotPickUp': 'Nie można tego podnieść',
} satisfies Partial<Record<keyof typeof en, string>>;
