/** Russian text of the `duel` window. */

import type en from './en';

export default {
  'duel.request': '{name} вызывает вас на дуэль.',
  'duel.wins': '{winner} победил в дуэли против {loser}.',
  'duel.watchTitle': 'Состояние дуэли',
  'duel.channel': 'Дуэльный канал {number}',
  'duel.emptyChannel': 'Пустой канал',
  'duel.join': 'Смотреть',
  'duel.vs': 'VS',
  'duel.leaveWatch': 'Покинуть дуэльный канал',
  'duel.stop': 'Прервать',
} satisfies Partial<Record<keyof typeof en, string>>;
