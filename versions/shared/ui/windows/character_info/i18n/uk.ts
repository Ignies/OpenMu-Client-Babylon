/** uk text of `versions/shared/ui/windows/character_info`. */

import type en from './en';

export default {
  'stat.short.strength': 'СИЛ',
  'stat.short.agility': 'СПР',
  'stat.short.vitality': 'ВИТ',
  'stat.short.energy': 'ЕНР',
  'charInfo.dmgRate': 'Шкода (шанс): {min}~{max} ({rate})',
  'charInfo.dmg': 'Шкода: {min}~{max}',
  'charInfo.attackRate': 'Влучність: {value}',
  'charInfo.defenseRateFull': 'Захист (шанс): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Захист (шанс): {defense} ({rate})',
  'charInfo.defenseFull': 'Захист: {defense} (+{bonus})',
  'charInfo.defense': 'Захист: {defense}',
  'charInfo.defenseRatePvp': 'Шанс захисту: {value}',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'Шкода в ближньому бою: {value}%',
  'charInfo.mana': 'Мана: {current} / {max}',
  'charInfo.wizardryRate': 'Магічна шкода: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Магічна шкода: {min}~{max}',
  'charInfo.curseSpell': 'Шкода прокльону: {min} ~ {max}',
  'charInfo.skillDamage': 'Шкода навичок: {value}%',
  'charInfo.divineDamage': 'Божественна шкода (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Шкода по площі (Dark Side): {value}%',
  'charInfo.addAmount': 'Скільки очок додати',
  'charInfo.stopAdding': 'Зупинити',
  'characterInfo.title': 'Персонаж',
  'characterInfo.close': 'Закрити (C)',
  'characterInfo.quest': 'Завдання (T)',
  'characterInfo.pet': 'Вихованець',
  'characterInfo.masterTree': 'Дерево майстерності (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
