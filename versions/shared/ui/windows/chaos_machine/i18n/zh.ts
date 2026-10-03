/** Chinese text of the `chaos_machine` window. */

import type en from './en';

export default {
  'chaos.title': '混沌重组机',
  'chaos.combine': '合成',
  'chaos.combining': '合成中…',
  'chaos.tax': '混沌税：{rate}%',
  'chaosCard.title': '混沌卡片',
  'chaosCard.hint1': '把混沌卡片放入格子',
  'chaosCard.hint2': '然后点击合成即可开启。',
} satisfies Partial<Record<keyof typeof en, string>>;
