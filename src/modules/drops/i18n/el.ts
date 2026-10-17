/** el text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Αυτό το αντικείμενο δεν ρίχνεται',
  'notify.carryingTooMuchZen': 'Κουβαλάτε πάρα πολλά Zen',
  'notify.cannotPickUp': 'Αυτό δεν μαζεύεται',
} satisfies Partial<Record<keyof typeof en, string>>;
