/** Thai text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} ท้าดวลคุณ',
  'duel.wins': '{winner} ชนะการดวลกับ {loser}',
  'duel.score': 'คะแนน',
  'duel.watchTitle': 'สถานะการดวล',
  'duel.channel': 'ช่องดวล {number}',
  'duel.emptyChannel': 'ช่องว่าง',
  'duel.join': 'ชม',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'ออกจากช่องดวล',
  'duel.stop': 'จบการดวล',
} satisfies Partial<Record<keyof typeof en, string>>;
