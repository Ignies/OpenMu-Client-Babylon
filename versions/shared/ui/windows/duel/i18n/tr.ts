/** tr text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': '{name} adlı oyuncu seni düelloya davet etti.',
  'duel.wins': 'Düelloyu kazanan: {winner} (rakip: {loser}).',
  'duel.watchTitle': 'Düello Durumu',
  'duel.channel': 'Düello Kanalı {number}',
  'duel.emptyChannel': 'Boş kanal',
  'duel.join': 'İzle',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Düello kanalından ayrıl',
  'duel.stop': 'Düelloyu bitir',
} satisfies Partial<Record<keyof typeof en, string>>;
