/** hu text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': '{name} párbajra hívott téged.',
  'duel.wins': '{winner} megnyerte a párbajt {loser} ellen.',
  'duel.watchTitle': 'Párbaj állása',
  'duel.channel': 'Párbajcsatorna {number}',
  'duel.emptyChannel': 'Üres csatorna',
  'duel.join': 'Megtekintés',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Kilépés a párbajcsatornából',
  'duel.stop': 'Párbaj vége',
} satisfies Partial<Record<keyof typeof en, string>>;
