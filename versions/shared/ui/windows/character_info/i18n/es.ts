/** Spanish text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': 'FUE',
  'stat.short.agility': 'AGI',
  'stat.short.vitality': 'VIT',
  'stat.short.energy': 'ENE',

  'charInfo.dmgRate': 'Daño (tasa): {min}~{max} ({rate})',
  'charInfo.dmg': 'Daño: {min}~{max}',
  'charInfo.attackRate': 'Tasa de ataque: {value}',
  'charInfo.defenseRateFull': 'Defensa (tasa): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Defensa (tasa): {defense} ({rate})',
  'charInfo.defenseFull': 'Defensa: {defense} (+{bonus})',
  'charInfo.defense': 'Defensa: {defense}',
  'charInfo.defenseRatePvp': 'Tasa de defensa: {value}',
  'charInfo.hp': 'Vida: {current} / {max}',
  'charInfo.meleeDamage': 'Daño cuerpo a cuerpo: {value}%',
  'charInfo.mana': 'Maná: {current} / {max}',
  'charInfo.wizardryRate': 'Daño mágico: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Daño mágico: {min}~{max}',
  'charInfo.curseSpell': ' Hechizo de maldición: {min} ~ {max}',
  'charInfo.curseSpellRate': ' Hechizo de maldición: {min} ~ {max}(+{rate})',
  'charInfo.skillDamage': 'Daño de habilidad: {value}%',
  'charInfo.divineDamage': 'Daño divino (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Daño en área (Dark Side): {value}%',
  'charInfo.addAmount': 'Puntos a añadir',
  'charInfo.stopAdding': 'Detener',

  'characterInfo.title': 'Personaje',
  'characterInfo.close': 'Cerrar (C)',
  'characterInfo.quest': 'Misión (T)',
  'characterInfo.pet': 'Mascota',
  'characterInfo.masterTree': 'Árbol de maestría (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
