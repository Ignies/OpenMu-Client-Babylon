/** Portuguese text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': 'Troca',
  'trade.warnCheck': 'Confira cada item antes de aceitar.',
  'trade.warnAlike': 'Itens podem parecer iguais e serem diferentes.',
  'trade.warnCancel': 'Uma troca cancelada devolve tudo.',
  'trade.cancel': 'Cancelar a troca',
  'trade.offerZen': 'Oferecer Zen',
  'trade.accept': 'Aceitar a troca',
} satisfies Partial<Record<keyof typeof en, string>>;
