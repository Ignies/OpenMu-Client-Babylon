/** Russian text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'Питомец',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': '{pet} не экипирован.',
  'petInfo.waiting': 'Ожидание данных о питомце...',
  'petInfo.level': 'Уровень {level}',
  'petInfo.life': 'Жизнь {current} / {max}',
  'petInfo.exp': 'Опыт {current} / {next}',
  'petInfo.damage': 'Урон {min}~{max} (Шанс {rate})',
  'petInfo.attackSpeed': 'Скорость атаки {speed}',
  'petInfo.defense': 'Защита {defense}',
  'petInfo.command': 'Команда',
  'petInfo.cmdNormal': 'Обычная атака',
  'petInfo.cmdRandom': 'Случайная атака',
  'petInfo.cmdOwner': 'Атаковать вместе с хозяином',
  'petInfo.cmdTarget': 'Атаковать цель',
  'petInfo.close': 'Закрыть',
} satisfies Partial<Record<keyof typeof en, string>>;
