/** sr-Latn text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Nepoznata veština',
  'skills.tooltip.class': 'Tvoja klasa ne može da je koristi',
  'skills.tooltip.weapon': 'Zahteva oružje koje je daje',
  'skills.tooltip.cooldown': 'Još nije spremna',
  'skills.tooltip.level': 'Zahteva nivo {level}',
  'skills.tooltip.energy': 'Zahteva energiju {energy}',
  'skills.tooltip.mana': 'Nedovoljno mane ({mana})',
  'skills.tooltip.ag': 'Nedovoljno AG ({ag})',
  'skills.tooltip.safezone': 'Ne može da se koristi u sigurnoj zoni',
  'skills.unnamed': 'Veština br. {number}',
  'skills.named': '{name} (niv. {level})',
  'skills.damage': 'Šteta veštine +{value}',
  'skills.distance': 'Domet: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Spremna za {seconds} s',
  'skills.delay': 'Kašnjenje: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
