/** Bulgarian text of the `skill_tooltip` interface widget. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Непознато умение',
  'skills.tooltip.class': 'Твоят клас не може да го използва',
  'skills.tooltip.weapon': 'Изисква оръжието, което го носи',
  'skills.tooltip.cooldown': 'Още не е готово',
  'skills.tooltip.level': 'Изисква ниво {level}',
  'skills.tooltip.energy': 'Изисква енергия {energy}',
  'skills.tooltip.mana': 'Недостатъчно мана ({mana})',
  'skills.tooltip.ag': 'Недостатъчно AG ({ag})',
  'skills.tooltip.safezone': 'Не може да се използва в безопасна зона',
  'skills.unnamed': 'Умение №{number}',
  'skills.named': '{name} (ниво {level})',
  'skills.damage': 'Щети от умението +{value}',
  'skills.distance': 'Разстояние: {value}',
  'skills.mana': 'Мана: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Готово след {seconds} с',
  'skills.delay': 'Забавяне: {seconds} с',
} satisfies Partial<Record<keyof typeof en, string>>;
