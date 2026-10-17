/** bn text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'ঠিক আছে',
  'common.cancel': 'বাতিল',
  'common.close': 'বন্ধ',
  'common.none': 'নেই',
  'common.create': 'তৈরি করুন',
  'common.creating': 'তৈরি হচ্ছে...',
  'common.send': 'পাঠান',
  'common.sending': 'পাঠানো হচ্ছে...',
  'common.loading': 'লোড হচ্ছে...',
  'common.warning': 'সতর্কতা',
  'common.level': 'লেভেল',
  'common.offline': 'অফলাইন',
  'common.off': 'বন্ধ',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'যথেষ্ট Zen নেই',
  'options.quality.classic': 'ক্লাসিক',
  'options.quality.enhanced': 'উন্নত',
} satisfies Partial<Record<keyof typeof en, string>>;
