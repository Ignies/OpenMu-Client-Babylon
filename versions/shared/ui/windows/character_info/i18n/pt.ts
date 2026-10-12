/** Portuguese text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': 'FOR',
  'stat.short.agility': 'AGI',
  'stat.short.vitality': 'VIT',
  'stat.short.energy': 'ENE',

  'charInfo.dmgRate': 'Dano (taxa): {min}~{max} ({rate})',
  'charInfo.dmg': 'Dano: {min}~{max}',
  'charInfo.attackRate': 'Taxa de ataque: {value}',
  'charInfo.defenseRateFull': 'Defesa (taxa): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Defesa (taxa): {defense} ({rate})',
  'charInfo.defenseFull': 'Defesa: {defense} (+{bonus})',
  'charInfo.defense': 'Defesa: {defense}',
  'charInfo.defenseRatePvp': 'Taxa de defesa: {value}',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'Dano corpo a corpo: {value}%',
  'charInfo.mana': 'Mana: {current} / {max}',
  'charInfo.wizardryRate': 'Dano mágico: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Dano mágico: {min}~{max}',
  'charInfo.curseSpell': ' Feitiço de Maldição: {min} ~ {max}',
  'charInfo.curseSpellRate': ' Feitiço de Maldição: {min} ~ {max}(+{rate})',
  'charInfo.skillDamage': 'Dano de habilidade: {value}%',
  'charInfo.divineDamage': 'Dano divino (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Dano em área (Dark Side): {value}%',
  'charInfo.addAmount': 'Pontos a adicionar',
  'charInfo.stopAdding': 'Parar',

  'characterInfo.title': 'Personagem',
  'characterInfo.close': 'Fechar (C)',
  'characterInfo.quest': 'Missão (T)',
  'characterInfo.pet': 'Mascote',
  'characterInfo.masterTree': 'Árvore de mestre (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
