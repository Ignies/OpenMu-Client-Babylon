/** ca text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Habilitat desconeguda',
  'skills.tooltip.class': 'La teva classe no la pot fer servir',
  'skills.tooltip.weapon': 'Requereix l\'arma que la porta',
  'skills.tooltip.cooldown': 'Encara no està a punt',
  'skills.tooltip.level': 'Requereix el nivell {level}',
  'skills.tooltip.energy': 'Requereix {energy} d\'energia',
  'skills.tooltip.mana': 'No tens prou manà ({mana})',
  'skills.tooltip.ag': 'No tens prou AG ({ag})',
  'skills.tooltip.safezone': 'No es pot fer servir en una zona segura',
  'skills.unnamed': 'Habilitat núm. {number}',
  'skills.named': '{name} (Nv.{level})',
  'skills.damage': 'Dany de l\'habilitat +{value}',
  'skills.distance': 'Distància: {value}',
  'skills.mana': 'Manà: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'A punt d\'aquí a {seconds} s',
  'skills.delay': 'Espera: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
