/** uk text of `versions/shared/ui/windows/duel`. */

import type en from './en';

export default {
  'duel.request': 'Гравець {name} викликає вас на дуель.',
  'duel.wins': 'Переможець дуелі: {winner} (суперник: {loser}).',
  'duel.watchTitle': 'Стан дуелі',
  'duel.channel': 'Канал дуелі {number}',
  'duel.emptyChannel': 'Порожній канал',
  'duel.join': 'Дивитися',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Покинути канал дуелі',
  'duel.stop': 'Завершити дуель',
} satisfies Partial<Record<keyof typeof en, string>>;
