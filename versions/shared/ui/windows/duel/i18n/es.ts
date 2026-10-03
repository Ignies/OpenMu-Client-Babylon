/** Spanish text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} te ha retado a un duelo.',
  'duel.wins': '{winner} ha ganado el duelo contra {loser}.',
  'duel.watchTitle': 'Estado del duelo',
  'duel.channel': 'Canal de duelo {number}',
  'duel.emptyChannel': 'Canal vacío',
  'duel.join': 'Ver',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Salir del canal de duelo',
  'duel.stop': 'Terminar',
} satisfies Partial<Record<keyof typeof en, string>>;
