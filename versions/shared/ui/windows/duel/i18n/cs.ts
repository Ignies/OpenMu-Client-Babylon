/** cs text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': 'Hráč {name} tě vyzývá k souboji.',
  'duel.wins': 'Souboj vyhrál hráč {winner} (soupeř: {loser}).',
  'duel.watchTitle': 'Stav souboje',
  'duel.channel': 'Soubojový kanál {number}',
  'duel.emptyChannel': 'Prázdný kanál',
  'duel.join': 'Sledovat',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Opustit soubojový kanál',
  'duel.stop': 'Ukončit souboj',
} satisfies Partial<Record<keyof typeof en, string>>;
