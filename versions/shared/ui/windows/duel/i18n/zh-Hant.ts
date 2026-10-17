/** zh-Hant text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': '玩家{name}向你發起了決鬥。',
  'duel.wins': '玩家{winner}在與玩家{loser}的決鬥中獲勝。',
  'duel.watchTitle': '決鬥狀況',
  'duel.channel': '決鬥頻道{number}',
  'duel.emptyChannel': '空頻道',
  'duel.join': '觀戰',
  'duel.vs': 'VS',
  'duel.leaveWatch': '離開決鬥頻道',
  'duel.stop': '結束決鬥',
} satisfies Partial<Record<keyof typeof en, string>>;
