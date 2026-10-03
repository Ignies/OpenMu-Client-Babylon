/** Bulgarian text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': 'Личен магазин',
  'personalShop.button': 'Магазин',
  'personalShop.selling': 'Магазинът ти е отворен',
  'personalShop.namePlaceholder': 'Име на магазина',
  'personalShop.openTip': 'Отвори магазина',
  'personalShop.closeTip': 'Затвори магазина',
  'personalShop.info1': 'Сложи цена на всеки предмет, преди да отвориш.',
  'personalShop.info2': 'Магазинът затваря, ако се движиш или излезеш.',
  'personalShop.info3': 'Купувачите трябва да стоят до теб.',
  'personalShop.info4': 'Предмети с цена не могат да се използват или пускат.',
  'personalShop.info5': 'Zen влиза направо в раницата ти.',
  'personalShop.warn1': 'Никога не продавай под стойността на предмета.',
  'personalShop.warn2': 'Последната дума за цените има сървърът.',
} satisfies Partial<Record<keyof typeof en, string>>;
