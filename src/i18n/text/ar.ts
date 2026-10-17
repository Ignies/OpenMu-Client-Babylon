/** ar text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'موافق',
  'common.cancel': 'إلغاء',
  'common.close': 'إغلاق',
  'common.none': 'لا شيء',
  'common.create': 'إنشاء',
  'common.creating': 'جار الإنشاء...',
  'common.send': 'إرسال',
  'common.sending': 'جار الإرسال...',
  'common.loading': 'جار التحميل...',
  'common.warning': 'تحذير',
  'common.level': 'المستوى',
  'common.offline': 'غير متصل',
  'common.off': 'إيقاف',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'لا يوجد ما يكفي من Zen',
  'options.quality.classic': 'كلاسيكي',
  'options.quality.enhanced': 'محسّن',
} satisfies Partial<Record<keyof typeof en, string>>;
