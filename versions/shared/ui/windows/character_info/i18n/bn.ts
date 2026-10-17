/** bn text of `versions/shared/ui/windows/character_info`. */

import type en from './en';

export default {
  'stat.short.strength': 'শক্তি',
  'stat.short.agility': 'ক্ষিপ্রতা',
  'stat.short.vitality': 'প্রাণ',
  'stat.short.energy': 'এনার্জি',
  'charInfo.dmgRate': 'ক্ষতি (হার): {min}~{max} ({rate})',
  'charInfo.dmg': 'ক্ষতি: {min}~{max}',
  'charInfo.attackRate': 'আক্রমণ হার: {value}',
  'charInfo.defenseRateFull': 'প্রতিরক্ষা (হার): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'প্রতিরক্ষা (হার): {defense} ({rate})',
  'charInfo.defenseFull': 'প্রতিরক্ষা: {defense} (+{bonus})',
  'charInfo.defense': 'প্রতিরক্ষা: {defense}',
  'charInfo.defenseRatePvp': 'প্রতিরক্ষা হার: {value}',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'হাতাহাতি ক্ষতি: {value}%',
  'charInfo.mana': 'মানা: {current} / {max}',
  'charInfo.wizardryRate': 'জাদু ক্ষতি: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'জাদু ক্ষতি: {min}~{max}',
  'charInfo.curseSpell': 'অভিশাপ মন্ত্র: {min} ~ {max}',
  'charInfo.skillDamage': 'স্কিল ক্ষতি: {value}%',
  'charInfo.divineDamage': 'দিব্য ক্ষতি (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'এলাকাজুড়ে ক্ষতি (Dark Side): {value}%',
  'charInfo.addAmount': 'কত পয়েন্ট যোগ করবেন',
  'charInfo.stopAdding': 'থামুন',
  'characterInfo.title': 'চরিত্র',
  'characterInfo.close': 'বন্ধ (C)',
  'characterInfo.quest': 'কোয়েস্ট (T)',
  'characterInfo.pet': 'পোষ্য',
  'characterInfo.masterTree': 'মাস্টার স্কিল ট্রি (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
