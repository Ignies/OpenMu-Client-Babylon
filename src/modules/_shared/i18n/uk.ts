/** uk text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'Для особистої крамниці потрібен рівень персонажа 6.',
  'personalShop.openFailed': 'Не вдалося відкрити крамницю.',
  'personalShop.cannotSell': 'Цей предмет не можна продавати в крамниці.',
  'personalShop.itemGone': 'Цього предмета вже немає.',
  'guild.alreadyInGuild': 'Ви вже належите до гільдії.',
  'guild.notGuildMaster': 'Цей гравець не є майстром гільдії.',
  'guild.requestFailed': 'Запит гільдії не вдався.',
  'quest.itemFallback': 'Предмет {id}',
  'event.shortOfZen': 'Вам бракує Zen.',
  'notify.negativePrice': 'Ціна не може бути від’ємною',
} satisfies Partial<Record<keyof typeof en, string>>;
