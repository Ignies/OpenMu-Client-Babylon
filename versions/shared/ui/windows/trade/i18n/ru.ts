/** Russian text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': 'Обмен',
  'trade.warnCheck': 'Проверьте каждый предмет, прежде чем соглашаться.',
  'trade.warnAlike': 'Предметы могут выглядеть одинаково и различаться.',
  'trade.warnCancel': 'Отменённый обмен возвращает всё.',
  'trade.cancel': 'Отменить обмен',
  'trade.offerZen': 'Предложить Zen',
  'trade.accept': 'Принять обмен',
} satisfies Partial<Record<keyof typeof en, string>>;
