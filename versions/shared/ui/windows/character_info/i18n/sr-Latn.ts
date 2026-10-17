/** sr-Latn text of `versions/shared/ui/windows/character_info`. */

import type en from './en';

export default {
  'stat.short.strength': 'SNA',
  'stat.short.agility': 'SPR',
  'stat.short.vitality': 'VIT',
  'stat.short.energy': 'ENE',
  'charInfo.dmgRate': 'Šteta (stopa): {min}~{max} ({rate})',
  'charInfo.dmg': 'Šteta: {min}~{max}',
  'charInfo.attackRate': 'Preciznost napada: {value}',
  'charInfo.defenseRateFull': 'Odbrana (stopa): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Odbrana (stopa): {defense} ({rate})',
  'charInfo.defenseFull': 'Odbrana: {defense} (+{bonus})',
  'charInfo.defense': 'Odbrana: {defense}',
  'charInfo.defenseRatePvp': 'Stopa odbrane: {value}',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'Šteta izbliza: {value}%',
  'charInfo.mana': 'Mana: {current} / {max}',
  'charInfo.wizardryRate': 'Magijska šteta: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Magijska šteta: {min}~{max}',
  'charInfo.curseSpell': 'Šteta kletve: {min} ~ {max}',
  'charInfo.skillDamage': 'Šteta veština: {value}%',
  'charInfo.divineDamage': 'Božanska šteta (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Šteta po oblasti (Dark Side): {value}%',
  'charInfo.addAmount': 'Poeni za dodavanje',
  'charInfo.stopAdding': 'Stani',
  'characterInfo.title': 'Lik',
  'characterInfo.close': 'Zatvori (C)',
  'characterInfo.quest': 'Zadatak (T)',
  'characterInfo.pet': 'Ljubimac',
  'characterInfo.masterTree': 'Master stablo veština (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
