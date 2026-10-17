/** hi text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'वह आइटम गिराया नहीं जा सकता',
  'notify.carryingTooMuchZen': 'आपके पास बहुत ज़्यादा Zen है',
  'notify.cannotPickUp': 'इसे उठाया नहीं जा सकता',
  'drop.skill': '+स्किल',
  'drop.option': '+विकल्प',
  'drop.luck': '+भाग्य',
  'drop.knightSkill': 'नाइट की खास स्किल',
} satisfies Partial<Record<keyof typeof en, string>>;
