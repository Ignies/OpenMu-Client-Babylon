/** uk text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'Вихованець',
  'petInfo.darkHorse': 'Темний кінь',
  'petInfo.darkRaven': 'Темний крук',
  'petInfo.notEquipped': 'Вихованця {pet} не вдягнуто.',
  'petInfo.waiting': 'Очікування даних про вихованця...',
  'petInfo.level': 'Рівень {level}',
  'petInfo.life': 'Здоров’я {current} / {max}',
  'petInfo.exp': 'Досвід {current} / {next}',
  'petInfo.damage': 'Шкода {min}~{max} (шанс {rate})',
  'petInfo.attackSpeed': 'Швидкість атаки {speed}',
  'petInfo.defense': 'Захист {defense}',
  'petInfo.command': 'Команда',
  'petInfo.cmdNormal': 'Звичайна атака',
  'petInfo.cmdRandom': 'Випадкова атака',
  'petInfo.cmdOwner': 'Атакувати з власником',
  'petInfo.cmdTarget': 'Атакувати ціль',
} satisfies Partial<Record<keyof typeof en, string>>;
