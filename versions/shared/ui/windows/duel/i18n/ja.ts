/** Japanese text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} が決闘を申し込みました。',
  'duel.wins': '{winner} が {loser} との決闘に勝ちました。',
  'duel.score': 'スコア',
  'duel.watchTitle': '決闘の状況',
  'duel.channel': '決闘チャンネル {number}',
  'duel.emptyChannel': '空のチャンネル',
  'duel.join': '観戦',
  'duel.vs': 'VS',
  'duel.leaveWatch': '決闘チャンネルから出る',
  'duel.stop': '決闘終了',
} satisfies Partial<Record<keyof typeof en, string>>;
