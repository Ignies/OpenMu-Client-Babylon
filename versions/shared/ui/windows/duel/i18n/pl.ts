/** Polish text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} wyzywa cię na pojedynek.',
  'duel.wins': 'Zwycięzca pojedynku: {winner} (przeciwnik: {loser}).',
  'duel.watchTitle': 'Stan pojedynku',
  'duel.channel': 'Kanał pojedynku {number}',
  'duel.emptyChannel': 'Pusty kanał',
  'duel.join': 'Oglądaj',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Opuść kanał pojedynku',
  'duel.stop': 'Zakończ',
} satisfies Partial<Record<keyof typeof en, string>>;
