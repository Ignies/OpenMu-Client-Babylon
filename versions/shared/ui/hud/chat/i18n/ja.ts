/** Japanese text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': '通常',
  'chat.gens': 'ゲンス',
  'chat.blockWhisper': 'ささやきを拒否',
  'chat.system': 'システムメッセージ',
  'chat.log': 'チャットログ',
  'chat.frame': '枠',
  'chat.size': 'サイズ',
  'chat.alpha': '透明度',
  'chat.whisperOff': 'ささやきはオフです（F3）',
  'chat.emoji.button': '絵文字',
  'chat.emoji.recent': '最近使ったもの',
  'chat.latest': '最新のメッセージに戻る',
} satisfies Partial<Record<keyof typeof en, string>>;
