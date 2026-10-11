/** Romanian text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} te-a provocat la duel.',
  'duel.wins': '{winner} a câștigat duelul împotriva lui {loser}.',
  'duel.watchTitle': 'Starea duelului',
  'duel.channel': 'Canalul de duel {number}',
  'duel.emptyChannel': 'Canal gol',
  'duel.join': 'Privește',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Ieși din canalul de duel',
  'duel.stop': 'Încheie',
} satisfies Partial<Record<keyof typeof en, string>>;
