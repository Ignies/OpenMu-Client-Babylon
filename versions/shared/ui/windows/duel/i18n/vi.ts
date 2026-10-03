/** Vietnamese text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} đã thách đấu tay đôi với bạn.',
  'duel.wins': '{winner} đã thắng {loser} trong trận đấu tay đôi.',
  'duel.score': 'Tỉ số',
  'duel.watchTitle': 'Tình hình trận đấu',
  'duel.channel': 'Kênh đấu {number}',
  'duel.emptyChannel': 'Kênh trống',
  'duel.join': 'Xem',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Rời kênh đấu',
  'duel.stop': 'Kết thúc',
} satisfies Partial<Record<keyof typeof en, string>>;
