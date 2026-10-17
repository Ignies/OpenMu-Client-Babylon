/** el text of `versions/shared/ui/windows/character_info`. */

import type en from './en';

export default {
  'stat.short.strength': 'ΔΥΝ',
  'stat.short.agility': 'ΕΥΚ',
  'stat.short.vitality': 'ΖΩΤ',
  'stat.short.energy': 'ΕΝΕ',
  'charInfo.dmgRate': 'Ζημιά (ποσοστό): {min}~{max} ({rate})',
  'charInfo.dmg': 'Ζημιά: {min}~{max}',
  'charInfo.attackRate': 'Ευστοχία: {value}',
  'charInfo.defenseRateFull': 'Άμυνα (ποσοστό): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Άμυνα (ποσοστό): {defense} ({rate})',
  'charInfo.defenseFull': 'Άμυνα: {defense} (+{bonus})',
  'charInfo.defense': 'Άμυνα: {defense}',
  'charInfo.defenseRatePvp': 'Αποφυγή: {value}',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'Ζημιά εγγύς μάχης: {value}%',
  'charInfo.mana': 'Μάνα: {current} / {max}',
  'charInfo.wizardryRate': 'Μαγική ζημιά: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Μαγική ζημιά: {min}~{max}',
  'charInfo.curseSpell': 'Ξόρκι κατάρας: {min} ~ {max}',
  'charInfo.skillDamage': 'Ζημιά δεξιοτήτων: {value}%',
  'charInfo.divineDamage': 'Θεϊκή ζημιά (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Ζημιά περιοχής (Dark Side): {value}%',
  'charInfo.addAmount': 'Πόντοι προς προσθήκη',
  'charInfo.stopAdding': 'Διακοπή',
  'characterInfo.title': 'Χαρακτήρας',
  'characterInfo.close': 'Κλείσιμο (C)',
  'characterInfo.quest': 'Αποστολή (T)',
  'characterInfo.pet': 'Κατοικίδιο',
  'characterInfo.masterTree': 'Δέντρο δεξιοτήτων Master (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
