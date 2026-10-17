/** hi text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'वह आइटम गिराया नहीं जा सकता',
  'notify.carryingTooMuchZen': 'आपके पास बहुत ज़्यादा Zen है',
  'notify.cannotPickUp': 'इसे उठाया नहीं जा सकता',
} satisfies Partial<Record<keyof typeof en, string>>;
