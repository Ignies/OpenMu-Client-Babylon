/** ca text of `versions/shared/ui/windows/character_info`. */

import type en from './en';

export default {
  'stat.short.strength': 'FOR',
  'stat.short.agility': 'AGI',
  'stat.short.vitality': 'VIT',
  'stat.short.energy': 'ENE',
  'charInfo.dmgRate': 'Dany (taxa): {min}~{max} ({rate})',
  'charInfo.dmg': 'Dany: {min}~{max}',
  'charInfo.attackRate': 'Taxa d\'atac: {value}',
  'charInfo.defenseRateFull': 'Defensa (taxa): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Defensa (taxa): {defense} ({rate})',
  'charInfo.defenseFull': 'Defensa: {defense} (+{bonus})',
  'charInfo.defense': 'Defensa: {defense}',
  'charInfo.defenseRatePvp': 'Taxa de defensa: {value}',
  'charInfo.hp': 'PV: {current} / {max}',
  'charInfo.meleeDamage': 'Dany cos a cos: {value}%',
  'charInfo.mana': 'Manà: {current} / {max}',
  'charInfo.wizardryRate': 'Dany màgic: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Dany màgic: {min}~{max}',
  'charInfo.curseSpell': 'Maledicció: {min} ~ {max}',
  'charInfo.skillDamage': 'Dany d\'habilitat: {value}%',
  'charInfo.divineDamage': 'Dany diví (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Dany en àrea (Dark Side): {value}%',
  'charInfo.addAmount': 'Punts a afegir',
  'charInfo.stopAdding': 'Atura',
  'characterInfo.title': 'Personatge',
  'characterInfo.close': 'Tanca (C)',
  'characterInfo.quest': 'Missió (T)',
  'characterInfo.pet': 'Mascota',
  'characterInfo.masterTree': 'Arbre d\'habilitats mestres (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
