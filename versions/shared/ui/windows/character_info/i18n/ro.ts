/** Romanian text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': 'FOR',
  'stat.short.agility': 'AGI',
  'stat.short.vitality': 'VIT',
  'stat.short.energy': 'ENE',

  'charInfo.dmgRate': 'Daune (rată): {min}~{max} ({rate})',
  'charInfo.dmg': 'Daune: {min}~{max}',
  'charInfo.attackRate': 'Rată de atac: {value}',
  'charInfo.attackRateBonus': 'Rată de atac: {value} (+{bonus})',
  'charInfo.defenseRateFull': 'Apărare (rată): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Apărare (rată): {defense} ({rate})',
  'charInfo.defenseFull': 'Apărare: {defense} (+{bonus})',
  'charInfo.defense': 'Apărare: {defense}',
  'charInfo.defenseRatePvp': 'Rată de apărare: {value}',
  'charInfo.defenseRatePvpBonus': 'Rată de apărare: {value} (+{bonus})',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'Daune corp la corp: {value}%',
  'charInfo.mana': 'Mana: {current} / {max}',
  'charInfo.wizardryRate': 'Daune magice: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Daune magice: {min}~{max}',
  'charInfo.curseSpell': ' Vrajă de blestem: {min} ~ {max}',
  'charInfo.curseSpellRate': ' Vrajă de blestem: {min} ~ {max}(+{rate})',
  'charInfo.skillDamage': 'Daunele abilității: {value}%',
  'charInfo.divineDamage': 'Daune divine (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Daune în zonă (Dark Side): {value}%',
  'charInfo.addAmount': 'Puncte de adăugat',
  'charInfo.stopAdding': 'Oprește',

  'characterInfo.title': 'Personaj',
  'characterInfo.close': 'Închide (C)',
  'characterInfo.quest': 'Misiune (T)',
  'characterInfo.pet': 'Însoțitor',
  'characterInfo.masterTree': 'Arborele de maestru (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
