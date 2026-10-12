/** Bulgarian text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': 'СИЛ',
  'stat.short.agility': 'ЛОВ',
  'stat.short.vitality': 'ИЗД',
  'stat.short.energy': 'ЕНР',

  'charInfo.dmgRate': 'Щети (шанс): {min}~{max} ({rate})',
  'charInfo.dmg': 'Щети: {min}~{max}',
  'charInfo.attackRate': 'Точност: {value}',
  'charInfo.defenseRateFull': 'Защита (шанс): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Защита (шанс): {defense} ({rate})',
  'charInfo.defenseFull': 'Защита: {defense} (+{bonus})',
  'charInfo.defense': 'Защита: {defense}',
  'charInfo.defenseRatePvp': 'Шанс за защита: {value}',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'Щети в близък бой: {value}%',
  'charInfo.mana': 'Мана: {current} / {max}',
  'charInfo.wizardryRate': 'Магически щети: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Магически щети: {min}~{max}',
  'charInfo.curseSpell': ' Щети от проклятие: {min} ~ {max}',
  'charInfo.curseSpellRate': ' Щети от проклятие: {min} ~ {max} (+{rate})',
  'charInfo.skillDamage': 'Щети от умения: {value}%',
  'charInfo.divineDamage': 'Божествени щети (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Щети в зона (Dark Side): {value}%',
  'charInfo.addAmount': 'Точки за добавяне',
  'charInfo.stopAdding': 'Спри',

  'characterInfo.title': 'Герой',
  'characterInfo.close': 'Затвори (C)',
  'characterInfo.quest': 'Мисия (T)',
  'characterInfo.pet': 'Питомец',
  'characterInfo.masterTree': 'Дърво на майсторството (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
