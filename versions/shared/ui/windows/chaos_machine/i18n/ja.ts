/** Japanese text of the `chaos_machine` window. */

import type en from './en';

export default {
  'chaos.title': 'カオスマシン',
  'chaos.combine': '合成',
  'chaos.combining': '合成中…',
  'chaos.tax': 'カオス税: {rate}%',
  'chaosCard.title': 'カオスカード',
  'chaosCard.hint1': 'カオスカードをトレイに入れて',
  'chaosCard.hint2': '組合ボタンを押すと開きます。',
} satisfies Partial<Record<keyof typeof en, string>>;
