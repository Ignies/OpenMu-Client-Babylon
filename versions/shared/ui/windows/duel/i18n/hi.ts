/** hi text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': '{name} ने आपको द्वंद्व की चुनौती दी है।',
  'duel.wins': '{winner} ने {loser} के विरुद्ध द्वंद्व जीत लिया है।',
  'duel.watchTitle': 'द्वंद्व की स्थिति',
  'duel.channel': 'द्वंद्व चैनल {number}',
  'duel.emptyChannel': 'खाली चैनल',
  'duel.join': 'देखें',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'द्वंद्व चैनल छोड़ें',
  'duel.stop': 'द्वंद्व खत्म करें',
} satisfies Partial<Record<keyof typeof en, string>>;
