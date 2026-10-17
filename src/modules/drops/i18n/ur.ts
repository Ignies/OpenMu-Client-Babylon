/** ur text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'یہ آئٹم گرایا نہیں جا سکتا',
  'notify.carryingTooMuchZen': 'آپ کے پاس بہت زیادہ Zen ہے',
  'notify.cannotPickUp': 'یہ اٹھایا نہیں جا سکتا',
  'drop.skill': '+سکل',
  'drop.option': '+آپشن',
  'drop.luck': '+قسمت',
  'drop.knightSkill': 'نائٹ کی خاص سکل',
} satisfies Partial<Record<keyof typeof en, string>>;
