/** Italian text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': 'FOR',
  'stat.short.agility': 'AGI',
  'stat.short.vitality': 'VIT',
  'stat.short.energy': 'ENE',

  'charInfo.dmgRate': 'Danno (tasso): {min}~{max} ({rate})',
  'charInfo.dmg': 'Danno: {min}~{max}',
  'charInfo.attackRate': 'Tasso di attacco: {value}',
  'charInfo.attackRateBonus': 'Tasso di attacco: {value} (+{bonus})',
  'charInfo.defenseRateFull': 'Difesa (tasso): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Difesa (tasso): {defense} ({rate})',
  'charInfo.defenseFull': 'Difesa: {defense} (+{bonus})',
  'charInfo.defense': 'Difesa: {defense}',
  'charInfo.attackSpeed': 'Velocità d’attacco: {value}',
  'charInfo.defenseRatePvp': 'Tasso di difesa: {value}',
  'charInfo.defenseRatePvpBonus': 'Tasso di difesa: {value} (+{bonus})',
  'charInfo.hp': 'PV: {current} / {max}',
  'charInfo.meleeDamage': 'Danno in mischia: {value}%',
  'charInfo.mana': 'Mana: {current} / {max}',
  'charInfo.wizardryRate': 'Danno magico: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Danno magico: {min}~{max}',
  'charInfo.curseSpell': ' Incantesimo di maledizione: {min} ~ {max}',
  'charInfo.curseSpellRate': ' Incantesimo di maledizione: {min} ~ {max}(+{rate})',
  'charInfo.skillDamage': 'Danno delle abilità: {value}%',
  'charInfo.divineDamage': 'Danno divino (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Danno ad area (Dark Side): {value}%',
  'charInfo.addAmount': 'Punti da aggiungere',
  'charInfo.stopAdding': 'Ferma',

  'characterInfo.title': 'Personaggio',
  'characterInfo.close': 'Chiudi (C)',
  'characterInfo.quest': 'Missione (T)',
  'characterInfo.pet': 'Famiglio',
  'characterInfo.masterTree': 'Albero di maestria (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
