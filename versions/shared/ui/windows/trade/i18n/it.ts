/** Italian text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': 'Scambio',
  'trade.warnCheck': 'Controlla ogni oggetto prima di accettare.',
  'trade.warnAlike': 'Due oggetti possono sembrare uguali ed essere diversi.',
  'trade.warnCancel': 'Uno scambio annullato restituisce tutto.',
  'trade.cancel': 'Annulla lo scambio',
  'trade.offerZen': 'Offri Zen',
  'trade.accept': 'Accetta lo scambio',
} satisfies Partial<Record<keyof typeof en, string>>;
