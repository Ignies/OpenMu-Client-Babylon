/** German text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} fordert dich zum Duell.',
  'duel.wins': '{winner} hat das Duell gegen {loser} gewonnen.',
  'duel.watchTitle': 'Duellstatus',
  'duel.channel': 'Duellkanal {number}',
  'duel.emptyChannel': 'Leerer Kanal',
  'duel.join': 'Zusehen',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Duellkanal verlassen',
  'duel.stop': 'Beenden',
} satisfies Partial<Record<keyof typeof en, string>>;
