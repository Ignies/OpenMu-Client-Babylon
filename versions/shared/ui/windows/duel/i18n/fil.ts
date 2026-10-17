/** fil text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': 'Hinamon ka ni {name} sa duelo.',
  'duel.wins': 'Nanalo si {winner} sa duelo laban kay {loser}.',
  'duel.watchTitle': 'Katayuan ng Duelo',
  'duel.channel': 'Channel ng Duelo {number}',
  'duel.emptyChannel': 'Bakanteng channel',
  'duel.join': 'Manood',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Umalis sa channel ng duelo',
  'duel.stop': 'Tapusin ang duelo',
} satisfies Partial<Record<keyof typeof en, string>>;
