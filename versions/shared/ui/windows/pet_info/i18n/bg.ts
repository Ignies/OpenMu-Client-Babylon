/** Bulgarian text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'Питомец',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': '{pet} не е екипиран.',
  'petInfo.waiting': 'Изчакване на данните за питомеца...',
  'petInfo.level': 'Ниво {level}',
  'petInfo.life': 'Живот {current} / {max}',
  'petInfo.exp': 'Опит {current} / {next}',
  'petInfo.damage': 'Щета {min}~{max} (Шанс {rate})',
  'petInfo.attackSpeed': 'Скорост на атака {speed}',
  'petInfo.defense': 'Защита {defense}',
  'petInfo.command': 'Команда',
  'petInfo.cmdNormal': 'Обикновена атака',
  'petInfo.cmdRandom': 'Случайна атака',
  'petInfo.cmdOwner': 'Атака заедно със стопанина',
  'petInfo.cmdTarget': 'Атака по целта',
} satisfies Partial<Record<keyof typeof en, string>>;
