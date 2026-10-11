/** Russian text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': 'Личный магазин',
  'personalShop.button': 'Магазин',
  'personalShop.selling': 'Ваш магазин открыт',
  'personalShop.namePlaceholder': 'Название магазина',
  'personalShop.openTip': 'Открыть магазин',
  'personalShop.closeTip': 'Закрыть магазин',
  'personalShop.info1': 'Назначьте цену каждому предмету перед открытием.',
  'personalShop.info2': 'Магазин закроется, если вы сдвинетесь или выйдете.',
  'personalShop.info3': 'Покупатели должны стоять рядом с вами.',
  'personalShop.info4': 'Предметы с ценой нельзя использовать и выбрасывать.',
  'personalShop.info5': 'Zen поступает прямо в ваш инвентарь.',
  'personalShop.warn1': 'Никогда не продавайте дешевле реальной цены.',
  'personalShop.warn2': 'Последнее слово о ценах - за сервером.',
} satisfies Partial<Record<keyof typeof en, string>>;
