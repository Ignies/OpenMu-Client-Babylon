/** uk text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Невідома навичка',
  'skills.tooltip.class': 'Ваш клас не може її використовувати',
  'skills.tooltip.weapon': 'Потрібна зброя, яка дає цю навичку',
  'skills.tooltip.cooldown': 'Ще не готово',
  'skills.tooltip.level': 'Потрібен рівень {level}',
  'skills.tooltip.energy': 'Потрібна енергія {energy}',
  'skills.tooltip.mana': 'Бракує мани ({mana})',
  'skills.tooltip.ag': 'Бракує AG ({ag})',
  'skills.tooltip.safezone': 'Не можна використовувати в безпечній зоні',
  'skills.unnamed': 'Навичка №{number}',
  'skills.named': '{name} (рів. {level})',
  'skills.damage': 'Шкода навички +{value}',
  'skills.distance': 'Дальність: {value}',
  'skills.mana': 'Мана: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Готово через {seconds} с',
  'skills.delay': 'Затримка: {seconds} с',
} satisfies Partial<Record<keyof typeof en, string>>;
