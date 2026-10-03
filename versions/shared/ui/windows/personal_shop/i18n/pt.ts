/** Portuguese text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': 'Loja pessoal',
  'personalShop.button': 'Loja',
  'personalShop.selling': 'Sua loja está aberta',
  'personalShop.namePlaceholder': 'Nome da loja',
  'personalShop.openTip': 'Abrir a loja',
  'personalShop.closeTip': 'Fechar a loja',
  'personalShop.info1': 'Defina um preço em cada item antes de abrir.',
  'personalShop.info2': 'A loja fecha se você se mover ou sair do jogo.',
  'personalShop.info3': 'Os compradores precisam ficar ao seu lado.',
  'personalShop.info4': 'Itens com preço não podem ser usados nem largados.',
  'personalShop.info5': 'O Zen vai direto para o seu inventário.',
  'personalShop.warn1': 'Nunca venda por menos do que o item vale.',
  'personalShop.warn2': 'O servidor dá a palavra final sobre os preços.',
} satisfies Partial<Record<keyof typeof en, string>>;
