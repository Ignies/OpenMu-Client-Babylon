/** Bulgarian text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': 'Размяна',
  'trade.warnCheck': 'Провери всеки предмет, преди да приемеш.',
  'trade.warnAlike': 'Предметите могат да изглеждат еднакви, но да се различават.',
  'trade.warnCancel': 'Отказана размяна връща всичко.',
  'trade.cancel': 'Откажи размяната',
  'trade.offerZen': 'Предложи Zen',
  'trade.accept': 'Приеми размяната',
} satisfies Partial<Record<keyof typeof en, string>>;
