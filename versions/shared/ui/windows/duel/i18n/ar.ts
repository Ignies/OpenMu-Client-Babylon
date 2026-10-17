/** ar text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': 'تحداك اللاعب {name} إلى مبارزة.',
  'duel.wins': 'فاز اللاعب {winner} في المبارزة ضد اللاعب {loser}.',
  'duel.watchTitle': 'حالة المبارزة',
  'duel.channel': 'قناة المبارزة {number}',
  'duel.emptyChannel': 'قناة فارغة',
  'duel.join': 'مشاهدة',
  'duel.vs': 'ضد',
  'duel.leaveWatch': 'مغادرة قناة المبارزة',
  'duel.stop': 'إنهاء المبارزة',
} satisfies Partial<Record<keyof typeof en, string>>;
