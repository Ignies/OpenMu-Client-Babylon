/** id text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': '{name} menantangmu berduel.',
  'duel.wins': '{winner} memenangkan duel melawan {loser}.',
  'duel.watchTitle': 'Status Duel',
  'duel.channel': 'Channel Duel {number}',
  'duel.emptyChannel': 'Channel kosong',
  'duel.join': 'Tonton',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Keluar dari channel duel',
  'duel.stop': 'Akhiri duel',
} satisfies Partial<Record<keyof typeof en, string>>;
