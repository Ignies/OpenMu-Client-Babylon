/** Romanian text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': 'Schimb',
  'trade.warnCheck': 'Verifică fiecare obiect înainte să accepți.',
  'trade.warnAlike': 'Obiectele pot arăta la fel și totuși să difere.',
  'trade.warnCancel': 'Un schimb anulat returnează totul.',
  'trade.cancel': 'Anulează schimbul',
  'trade.offerZen': 'Oferă Zen',
  'trade.accept': 'Acceptă schimbul',
} satisfies Partial<Record<keyof typeof en, string>>;
