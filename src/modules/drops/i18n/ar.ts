/** ar text of `src/modules/drops`. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'لا يمكن إسقاط هذا الغرض',
  'notify.carryingTooMuchZen': 'تحمل الكثير من Zen',
  'notify.cannotPickUp': 'لا يمكن التقاط هذا',
} satisfies Partial<Record<keyof typeof en, string>>;
