/** Russian text of the `skill_tooltip` UI component. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Неизвестное умение',
  'skills.tooltip.class': 'Ваш класс не может им пользоваться',
  'skills.tooltip.weapon': 'Нужно оружие, которое его даёт',
  'skills.tooltip.cooldown': 'Ещё не готово',
  'skills.tooltip.level': 'Требуется уровень {level}',
  'skills.tooltip.energy': 'Требуется энергия {energy}',
  'skills.tooltip.mana': 'Не хватает маны ({mana})',
  'skills.tooltip.ag': 'Не хватает AG ({ag})',
  'skills.tooltip.safezone': 'Нельзя использовать в безопасной зоне',
  'skills.unnamed': 'Умение №{number}',
  'skills.named': '{name} (ур. {level})',
  'skills.damage': 'Урон умения +{value}',
  'skills.distance': 'Дальность: {value}',
  'skills.mana': 'Мана: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Готово через {seconds} с',
  'skills.delay': 'Задержка: {seconds} с',
} satisfies Partial<Record<keyof typeof en, string>>;
