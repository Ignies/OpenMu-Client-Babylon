/** Russian text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': 'СИЛ',
  'stat.short.agility': 'ЛОВ',
  'stat.short.vitality': 'ВЫН',
  'stat.short.energy': 'ЭНР',

  'charInfo.dmgRate': 'Урон (шанс): {min}~{max} ({rate})',
  'charInfo.dmg': 'Урон: {min}~{max}',
  'charInfo.attackRate': 'Меткость: {value}',
  'charInfo.defenseRateFull': 'Защита (шанс): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Защита (шанс): {defense} ({rate})',
  'charInfo.defenseFull': 'Защита: {defense} (+{bonus})',
  'charInfo.defense': 'Защита: {defense}',
  'charInfo.defenseRatePvp': 'Шанс защиты: {value}',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'Урон в ближнем бою: {value}%',
  'charInfo.mana': 'Мана: {current} / {max}',
  'charInfo.wizardryRate': 'Магический урон: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Магический урон: {min}~{max}',
  'charInfo.curseSpell': ' Заклинание проклятия: {min} ~ {max}',
  'charInfo.curseSpellRate': ' Заклинание проклятия: {min} ~ {max}(+{rate})',
  'charInfo.skillDamage': 'Урон умений: {value}%',
  'charInfo.divineDamage': 'Божественный урон (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Урон по области (Dark Side): {value}%',
  'charInfo.addAmount': 'Сколько очков добавить',
  'charInfo.stopAdding': 'Остановить',

  'characterInfo.title': 'Персонаж',
  'characterInfo.close': 'Закрыть (C)',
  'characterInfo.quest': 'Задание (T)',
  'characterInfo.pet': 'Питомец',
  'characterInfo.masterTree': 'Дерево мастерства (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
