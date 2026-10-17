/** ar text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'أغلق نافذة Chaos قبل الخروج من اللعبة.',
  'exit.noAnswer': 'لم يستجب الخادم. سيتم الخروج على أي حال.',
  'resume.done': 'عاد الاتصال',
  'resume.failed': 'تعذرت إعادة الاتصال',
  'resume.cancelled': 'تم إلغاء إعادة الاتصال',
} satisfies Partial<Record<keyof typeof en, string>>;
