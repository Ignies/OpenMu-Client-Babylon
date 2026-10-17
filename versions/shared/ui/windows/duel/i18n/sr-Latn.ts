/** sr-Latn text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': 'Igrač {name} te izaziva na duel.',
  'duel.wins': 'Pobednik duela: {winner} (protivnik: {loser}).',
  'duel.watchTitle': 'Stanje duela',
  'duel.channel': 'Kanal za duel {number}',
  'duel.emptyChannel': 'Prazan kanal',
  'duel.join': 'Gledaj',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Napusti kanal za duel',
  'duel.stop': 'Završi duel',
} satisfies Partial<Record<keyof typeof en, string>>;
