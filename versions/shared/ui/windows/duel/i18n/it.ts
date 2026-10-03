/** Italian text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} ti ha sfidato a duello.',
  'duel.wins': '{winner} ha vinto il duello contro {loser}.',
  'duel.watchTitle': 'Stato del duello',
  'duel.channel': 'Canale duello {number}',
  'duel.emptyChannel': 'Canale vuoto',
  'duel.join': 'Guarda',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Esci dal canale duello',
  'duel.stop': 'Termina',
} satisfies Partial<Record<keyof typeof en, string>>;
