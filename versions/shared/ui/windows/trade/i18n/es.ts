/** Spanish text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': 'Intercambio',
  'trade.warnCheck': 'Revisa cada objeto antes de aceptar.',
  'trade.warnAlike': 'Dos objetos pueden parecerse y ser distintos.',
  'trade.warnCancel': 'Al cancelar se devuelve todo.',
  'trade.cancel': 'Cancelar el intercambio',
  'trade.offerZen': 'Ofrecer Zen',
  'trade.accept': 'Aceptar el intercambio',
} satisfies Partial<Record<keyof typeof en, string>>;
