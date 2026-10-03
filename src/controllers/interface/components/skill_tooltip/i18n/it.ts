/** Italian text of the `skill_tooltip` interface widget. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Abilità sconosciuta',
  'skills.tooltip.class': 'La tua classe non può usarla',
  'skills.tooltip.weapon': 'Richiede l’arma che la porta',
  'skills.tooltip.cooldown': 'Non è ancora pronta',
  'skills.tooltip.level': 'Richiede il livello {level}',
  'skills.tooltip.energy': 'Richiede energia {energy}',
  'skills.tooltip.mana': 'Mana insufficiente ({mana})',
  'skills.tooltip.ag': 'AG insufficiente ({ag})',
  'skills.tooltip.safezone': 'Non utilizzabile in una zona sicura',
  'skills.unnamed': 'Abilità n. {number}',
  'skills.named': '{name} (Liv.{level})',
  'skills.damage': 'Danno dell’abilità +{value}',
  'skills.distance': 'Distanza: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Pronta tra {seconds} s',
  'skills.delay': 'Attesa: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
