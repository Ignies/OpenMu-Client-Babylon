/** ar text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'لا يمكن إسقاط هذا الغرض',
  'notify.carryingTooMuchZen': 'تحمل الكثير من Zen',
  'notify.cannotPickUp': 'لا يمكن التقاط هذا',
  'drop.skill': '+مهارة',
  'drop.option': '+خاصية',
  'drop.luck': '+الحظ',
  'drop.knightSkill': 'مهارة خاصة بالفارس',
} satisfies Partial<Record<keyof typeof en, string>>;
