/** Bulgarian text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'Личният магазин изисква ниво 6.',
  'personalShop.openFailed': 'Магазинът не можа да се отвори.',
  'personalShop.cannotSell': 'Този предмет не може да се продава в магазин.',
  'personalShop.itemGone': 'Този предмет вече го няма.',
  'guild.alreadyInGuild': 'Вече принадлежиш към guild.',
  'guild.notGuildMaster': 'Този играч не е майстор на guild.',
  'guild.requestFailed': 'Заявката за guild се провали.',
  'quest.itemFallback': 'Предмет {id}',
  'event.shortOfZen': 'Нямаш достатъчно Zen.',
  'notify.negativePrice': 'Цената не може да е отрицателна',
} satisfies Partial<Record<keyof typeof en, string>>;
