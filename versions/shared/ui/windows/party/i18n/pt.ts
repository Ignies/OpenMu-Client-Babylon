/** Portuguese text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'Grupo',
  'party.leader': 'Líder do grupo',
  'party.leave': 'Sair do grupo',
  'party.kick': 'Expulsar {name}',
  'party.nearby': 'Jogadores por perto',
  'party.nearbyEmpty': 'Fique ao lado de um jogador para convidá-lo.',
  'party.tradeWith': 'Trocar com {name}',
  'party.notInParty': 'Você não está em um grupo.',
  'party.invite': 'Convidar',
  'party.shop': 'Loja',
} satisfies Partial<Record<keyof typeof en, string>>;
