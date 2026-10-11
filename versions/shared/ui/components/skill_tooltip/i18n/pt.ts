/** Portuguese text of the `skill_tooltip` UI component. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Habilidade desconhecida',
  'skills.tooltip.class': 'Sua classe não pode usá-la',
  'skills.tooltip.weapon': 'Precisa da arma que a carrega',
  'skills.tooltip.cooldown': 'Ainda não está pronta',
  'skills.tooltip.level': 'Exige o nível {level}',
  'skills.tooltip.energy': 'Exige energia {energy}',
  'skills.tooltip.mana': 'Mana insuficiente ({mana})',
  'skills.tooltip.ag': 'AG insuficiente ({ag})',
  'skills.tooltip.safezone': 'Não pode ser usada numa zona segura',
  'skills.unnamed': 'Habilidade n.º {number}',
  'skills.named': '{name} (Nv.{level})',
  'skills.damage': 'Dano da habilidade +{value}',
  'skills.distance': 'Distância: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Pronta em {seconds} s',
  'skills.delay': 'Espera: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
