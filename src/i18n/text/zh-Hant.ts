/** zh-Hant text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': '確定',
  'common.cancel': '取消',
  'common.close': '關閉',
  'common.none': '無',
  'common.create': '建立',
  'common.creating': '建立中……',
  'common.send': '傳送',
  'common.sending': '傳送中……',
  'common.loading': '載入中……',
  'common.warning': '注意',
  'common.level': '等級',
  'common.offline': '離線',
  'common.off': '關',
  'common.zen': '金幣',
  'common.notEnoughZen': '金幣不足',
  'options.quality.classic': '經典',
  'options.quality.enhanced': '增強',
} satisfies Partial<Record<keyof typeof en, string>>;
