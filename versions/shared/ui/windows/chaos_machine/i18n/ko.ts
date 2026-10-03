/** Korean text of the `chaos_machine` window. */

import type en from './en';

export default {
  'chaos.title': '카오스 머신',
  'chaos.combine': '조합',
  'chaos.combining': '조합 중…',
  'chaos.tax': '카오스 수수료: {rate}%',
  'chaosCard.title': '카오스 카드',
  'chaosCard.hint1': '카오스 카드를 칸에 넣고',
  'chaosCard.hint2': '조합을 누르면 열립니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
