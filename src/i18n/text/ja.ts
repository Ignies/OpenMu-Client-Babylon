/** Japanese text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'キャンセル',
  'common.close': '閉じる',
  'common.none': 'なし',
  'common.create': '作成',
  'common.creating': '作成中...',
  'common.send': '送信',
  'common.sending': '送信中...',
  'common.loading': '読み込み中...',
  'common.warning': '注意',
  'common.level': 'レベル',
  'common.offline': 'オフライン',
  'common.off': 'オフ',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Zen が足りません',
  'options.quality.classic': 'クラシック',
  'options.quality.enhanced': '強化',
} satisfies Partial<Record<keyof typeof en, string>>;
