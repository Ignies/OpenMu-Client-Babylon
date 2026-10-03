/** Portuguese text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'A loja pessoal exige nível 6.',
  'personalShop.openFailed': 'Não foi possível abrir a loja.',
  'personalShop.cannotSell': 'Este item não pode ser vendido em uma loja.',
  'personalShop.itemGone': 'Esse item não está mais lá.',
  'guild.alreadyInGuild': 'Você já pertence a uma guild.',
  'guild.notGuildMaster': 'Esse jogador não é mestre de guild.',
  'guild.requestFailed': 'O pedido de guild falhou.',
  'quest.itemFallback': 'Item {id}',
  'event.shortOfZen': 'Você está sem Zen suficiente.',
  'notify.negativePrice': 'O preço não pode ser negativo',
} satisfies Partial<Record<keyof typeof en, string>>;
