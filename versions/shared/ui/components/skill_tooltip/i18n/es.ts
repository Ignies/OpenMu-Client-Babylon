/** Spanish text of the `skill_tooltip` UI component. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Habilidad desconocida',
  'skills.tooltip.class': 'Tu clase no puede usarla',
  'skills.tooltip.weapon': 'Necesita el arma que la lleva',
  'skills.tooltip.cooldown': 'Aún no está lista',
  'skills.tooltip.level': 'Requiere nivel {level}',
  'skills.tooltip.energy': 'Requiere energía {energy}',
  'skills.tooltip.mana': 'Maná insuficiente ({mana})',
  'skills.tooltip.ag': 'AG insuficiente ({ag})',
  'skills.tooltip.safezone': 'No se puede usar en una zona segura',
  'skills.unnamed': 'Habilidad n.º {number}',
  'skills.named': '{name} (Nv.{level})',
  'skills.damage': 'Daño de la habilidad +{value}',
  'skills.distance': 'Distancia: {value}',
  'skills.mana': 'Maná: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Lista en {seconds} s',
  'skills.delay': 'Espera: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
