/** French text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} vous défie en duel.',
  'duel.wins': '{winner} a gagné le duel contre {loser}.',
  'duel.watchTitle': 'État du duel',
  'duel.channel': 'Canal de duel {number}',
  'duel.emptyChannel': 'Canal vide',
  'duel.join': 'Regarder',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Quitter le canal de duel',
  'duel.stop': 'Terminer',
} satisfies Partial<Record<keyof typeof en, string>>;
