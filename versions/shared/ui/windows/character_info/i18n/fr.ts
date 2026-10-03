/** French text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': 'FOR',
  'stat.short.agility': 'AGI',
  'stat.short.vitality': 'VIT',
  'stat.short.energy': 'ÉNE',

  'charInfo.dmgRate': 'Dégâts (taux) : {min}~{max} ({rate})',
  'charInfo.dmg': 'Dégâts : {min}~{max}',
  'charInfo.attackRate': "Taux d'attaque : {value}",
  'charInfo.defenseRateFull': 'Défense (taux) : {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Défense (taux) : {defense} ({rate})',
  'charInfo.defenseFull': 'Défense : {defense} (+{bonus})',
  'charInfo.defense': 'Défense : {defense}',
  'charInfo.defenseRatePvp': 'Taux de défense : {value}',
  'charInfo.hp': 'PV : {current} / {max}',
  'charInfo.meleeDamage': 'Dégâts de mêlée : {value}%',
  'charInfo.mana': 'Mana : {current} / {max}',
  'charInfo.wizardryRate': 'Dégâts magiques : {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Dégâts magiques : {min}~{max}',
  'charInfo.curseSpell': ' Dégâts de malédiction : {min} ~ {max}',
  'charInfo.skillDamage': 'Dégâts de compétence : {value}%',
  'charInfo.divineDamage': 'Dégâts divins (Roar, Slasher) : {value}%',
  'charInfo.aoeDamage': 'Dégâts de zone (Dark Side) : {value}%',
  'charInfo.addAmount': 'Points à ajouter',
  'charInfo.stopAdding': 'Arrêter',

  'characterInfo.title': 'Personnage',
  'characterInfo.close': 'Fermer (C)',
  'characterInfo.quest': 'Quête (T)',
  'characterInfo.pet': 'Familier',
  'characterInfo.masterTree': 'Arbre de maîtrise (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
