/** fa text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'تأیید',
  'common.cancel': 'لغو',
  'common.close': 'بستن',
  'common.none': 'هیچ',
  'common.create': 'ساختن',
  'common.creating': 'در حال ساختن...',
  'common.send': 'ارسال',
  'common.sending': 'در حال ارسال...',
  'common.loading': 'در حال بارگذاری...',
  'common.warning': 'هشدار',
  'common.level': 'سطح',
  'common.offline': 'آفلاین',
  'common.off': 'خاموش',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Zen کافی نیست',
  'options.quality.classic': 'کلاسیک',
  'options.quality.enhanced': 'بهبودیافته',
} satisfies Partial<Record<keyof typeof en, string>>;
