/** Russian text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'Для личной лавки нужен 6-й уровень.',
  'personalShop.openFailed': 'Лавку не удалось открыть.',
  'personalShop.cannotSell': 'Этот предмет нельзя продавать в лавке.',
  'personalShop.itemGone': 'Этого предмета больше нет.',
  'guild.alreadyInGuild': 'Вы уже состоите в guild.',
  'guild.notGuildMaster': 'Этот игрок не мастер guild.',
  'guild.requestFailed': 'Запрос в guild не удался.',
  'quest.itemFallback': 'Предмет {id}',
  'event.shortOfZen': 'Вам не хватает Zen.',
  'notify.negativePrice': 'Цена не может быть отрицательной',
} satisfies Partial<Record<keyof typeof en, string>>;
