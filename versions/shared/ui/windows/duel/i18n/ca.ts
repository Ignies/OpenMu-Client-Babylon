/** ca text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': 'El jugador {name} t\'ha desafiat a un duel.',
  'duel.wins': 'El jugador {winner} ha guanyat el duel contra el jugador {loser}.',
  'duel.watchTitle': 'Estat del duel',
  'duel.channel': 'Canal de duel {number}',
  'duel.emptyChannel': 'Canal buit',
  'duel.join': 'Mira',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Surt del canal de duel',
  'duel.stop': 'Acaba el duel',
} satisfies Partial<Record<keyof typeof en, string>>;
