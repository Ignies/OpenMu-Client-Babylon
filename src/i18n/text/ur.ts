/** ur text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'ٹھیک ہے',
  'common.cancel': 'منسوخ کریں',
  'common.close': 'بند کریں',
  'common.none': 'کوئی نہیں',
  'common.create': 'بنائیں',
  'common.creating': 'بن رہا ہے...',
  'common.send': 'بھیجیں',
  'common.sending': 'بھیجا جا رہا ہے...',
  'common.loading': 'لوڈ ہو رہا ہے...',
  'common.warning': 'انتباہ',
  'common.level': 'لیول',
  'common.offline': 'آف لائن',
  'common.off': 'بند',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Zen کافی نہیں',
  'options.quality.classic': 'کلاسیکی',
  'options.quality.enhanced': 'بہتر',
} satisfies Partial<Record<keyof typeof en, string>>;
