/** bn text of `src/ecs`. */

import type en from './en';

export default {
  'instrument.needStanding': 'বাদ্যযন্ত্র বের করতে স্থির হয়ে দাঁড়ান',
  'notify.arrowsReloaded': 'তীর আবার ভরা হয়েছে',
  'notify.noMoreArrows': 'আর তীর নেই',
} satisfies Partial<Record<keyof typeof en, string>>;
