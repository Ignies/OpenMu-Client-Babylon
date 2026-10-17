/** el text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': 'Ο παίκτης {name} σας προκάλεσε σε μονομαχία.',
  'duel.wins': 'Ο παίκτης {winner} νίκησε τον παίκτη {loser} στη μονομαχία.',
  'duel.watchTitle': 'Κατάσταση μονομαχίας',
  'duel.channel': 'Κανάλι μονομαχίας {number}',
  'duel.emptyChannel': 'Άδειο κανάλι',
  'duel.join': 'Παρακολούθηση',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Αποχώρηση από το κανάλι μονομαχίας',
  'duel.stop': 'Λήξη μονομαχίας',
} satisfies Partial<Record<keyof typeof en, string>>;
