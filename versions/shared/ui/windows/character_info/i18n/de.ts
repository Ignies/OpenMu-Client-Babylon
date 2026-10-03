/** German text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': 'STR',
  'stat.short.agility': 'GES',
  'stat.short.vitality': 'VIT',
  'stat.short.energy': 'ENE',

  'charInfo.dmgRate': 'Schaden (Rate): {min}~{max} ({rate})',
  'charInfo.dmg': 'Schaden: {min}~{max}',
  'charInfo.attackRate': 'Angriffsrate: {value}',
  'charInfo.defenseRateFull': 'Abwehr (Rate): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Abwehr (Rate): {defense} ({rate})',
  'charInfo.defenseFull': 'Abwehr: {defense} (+{bonus})',
  'charInfo.defense': 'Abwehr: {defense}',
  'charInfo.defenseRatePvp': 'Abwehrrate: {value}',
  'charInfo.hp': 'LP: {current} / {max}',
  'charInfo.meleeDamage': 'Nahkampfschaden: {value}%',
  'charInfo.mana': 'Mana: {current} / {max}',
  'charInfo.wizardryRate': 'Magieschaden: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Magieschaden: {min}~{max}',
  'charInfo.curseSpell': ' Fluchschaden: {min} ~ {max}',
  'charInfo.skillDamage': 'Fertigkeitsschaden: {value}%',
  'charInfo.divineDamage': 'Göttlicher Schaden (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Flächenschaden (Dark Side): {value}%',
  'charInfo.addAmount': 'Punkte hinzufügen',
  'charInfo.stopAdding': 'Anhalten',

  'characterInfo.title': 'Charakter',
  'characterInfo.close': 'Schließen (C)',
  'characterInfo.quest': 'Quest (T)',
  'characterInfo.pet': 'Begleiter',
  'characterInfo.masterTree': 'Meisterbaum (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
