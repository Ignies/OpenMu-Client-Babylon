/** German text of the `skill_tooltip` interface widget. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Unbekannte Fertigkeit',
  'skills.tooltip.class': 'Deine Klasse kann sie nicht benutzen',
  'skills.tooltip.weapon': 'Erfordert die Waffe, die sie trägt',
  'skills.tooltip.cooldown': 'Noch nicht bereit',
  'skills.tooltip.level': 'Erfordert Level {level}',
  'skills.tooltip.energy': 'Erfordert Energie {energy}',
  'skills.tooltip.mana': 'Nicht genug Mana ({mana})',
  'skills.tooltip.ag': 'Nicht genug AG ({ag})',
  'skills.tooltip.safezone': 'In einer sicheren Zone nicht nutzbar',
  'skills.unnamed': 'Fertigkeit #{number}',
  'skills.named': '{name} (Stufe {level})',
  'skills.damage': 'Fertigkeitsschaden +{value}',
  'skills.distance': 'Reichweite: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Bereit in {seconds} s',
  'skills.delay': 'Verzögerung: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
