/** French text of the `skill_tooltip` interface widget. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Compétence inconnue',
  'skills.tooltip.class': 'Votre classe ne peut pas l’utiliser',
  'skills.tooltip.weapon': 'Nécessite l’arme qui la porte',
  'skills.tooltip.cooldown': 'Pas encore prête',
  'skills.tooltip.level': 'Nécessite le niveau {level}',
  'skills.tooltip.energy': 'Nécessite {energy} d’énergie',
  'skills.tooltip.mana': 'Mana insuffisant ({mana})',
  'skills.tooltip.ag': 'AG insuffisant ({ag})',
  'skills.tooltip.safezone': 'Inutilisable en zone sûre',
  'skills.unnamed': 'Compétence n° {number}',
  'skills.named': '{name} (Niv.{level})',
  'skills.damage': 'Dégâts de compétence +{value}',
  'skills.distance': 'Distance : {value}',
  'skills.mana': 'Mana : {value}',
  'skills.ag': 'AG : {value}',
  'skills.readyIn': 'Prête dans {seconds} s',
  'skills.delay': 'Délai : {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
