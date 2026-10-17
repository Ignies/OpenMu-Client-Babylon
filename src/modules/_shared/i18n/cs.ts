/** cs text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'Osobní obchod vyžaduje postavu na úrovni 6.',
  'personalShop.openFailed': 'Obchod nelze otevřít.',
  'personalShop.cannotSell': 'Tento předmět nelze v obchodě prodat.',
  'personalShop.itemGone': 'Tento předmět už tu není.',
  'guild.alreadyInGuild': 'Už patříš do cechu.',
  'guild.notGuildMaster': 'Tento hráč není mistr cechu.',
  'guild.requestFailed': 'Žádost cechu se nezdařila.',
  'quest.itemFallback': 'Předmět {id}',
  'event.shortOfZen': 'Nemáš dost Zen.',
  'notify.negativePrice': 'Cena nemůže být záporná',
} satisfies Partial<Record<keyof typeof en, string>>;
