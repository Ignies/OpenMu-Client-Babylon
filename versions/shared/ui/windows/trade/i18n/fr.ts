/** French text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': 'Échange',
  'trade.warnCheck': 'Vérifiez chaque objet avant d’accepter.',
  'trade.warnAlike': 'Deux objets peuvent se ressembler et différer.',
  'trade.warnCancel': 'Un échange annulé rend tout.',
  'trade.cancel': 'Annuler l’échange',
  'trade.offerZen': 'Proposer du Zen',
  'trade.accept': 'Accepter l’échange',
} satisfies Partial<Record<keyof typeof en, string>>;
