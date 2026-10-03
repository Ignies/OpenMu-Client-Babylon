/** Chinese text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} 向你发起了决斗。',
  'duel.wins': '{winner} 在与 {loser} 的决斗中获胜。',
  'duel.watchTitle': '决斗状况',
  'duel.channel': '决斗频道 {number}',
  'duel.emptyChannel': '空频道',
  'duel.join': '观战',
  'duel.vs': 'VS',
  'duel.leaveWatch': '离开决斗频道',
  'duel.stop': '结束决斗',
} satisfies Partial<Record<keyof typeof en, string>>;
