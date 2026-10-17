/** eu text of `versions/shared/ui/windows/character_info`. */

import type en from './en';

export default {
  'stat.short.strength': 'IND',
  'stat.short.agility': 'ARI',
  'stat.short.vitality': 'BIZ',
  'stat.short.energy': 'ENE',
  'charInfo.dmgRate': 'Kaltea (tasa): {min}~{max} ({rate})',
  'charInfo.dmg': 'Kaltea: {min}~{max}',
  'charInfo.attackRate': 'Eraso-tasa: {value}',
  'charInfo.defenseRateFull': 'Defentsa (tasa): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Defentsa (tasa): {defense} ({rate})',
  'charInfo.defenseFull': 'Defentsa: {defense} (+{bonus})',
  'charInfo.defense': 'Defentsa: {defense}',
  'charInfo.defenseRatePvp': 'Defentsa-tasa: {value}',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'Gertuko kaltea: {value}%',
  'charInfo.mana': 'Mana: {current} / {max}',
  'charInfo.wizardryRate': 'Magia-kaltea: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Magia-kaltea: {min}~{max}',
  'charInfo.curseSpell': 'Madarikazio-kaltea: {min} ~ {max}',
  'charInfo.skillDamage': 'Trebetasun-kaltea: {value}%',
  'charInfo.divineDamage': 'Kalte dibinoa (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Eremuko kaltea (Dark Side): {value}%',
  'charInfo.addAmount': 'Gehitzeko puntuak',
  'charInfo.stopAdding': 'Gelditu',
  'characterInfo.title': 'Pertsonaia',
  'characterInfo.close': 'Itxi (C)',
  'characterInfo.quest': 'Misioa (T)',
  'characterInfo.pet': 'Maskota',
  'characterInfo.masterTree': 'Maisu-trebetasunen zuhaitza (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
