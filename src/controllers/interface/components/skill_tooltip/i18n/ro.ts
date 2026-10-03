/** Romanian text of the `skill_tooltip` interface widget. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Abilitate necunoscută',
  'skills.tooltip.class': 'Clasa ta nu o poate folosi',
  'skills.tooltip.weapon': 'Necesită arma care o poartă',
  'skills.tooltip.cooldown': 'Încă nu este gata',
  'skills.tooltip.level': 'Necesită nivelul {level}',
  'skills.tooltip.energy': 'Necesită energie {energy}',
  'skills.tooltip.mana': 'Mana insuficientă ({mana})',
  'skills.tooltip.ag': 'AG insuficient ({ag})',
  'skills.tooltip.safezone': 'Nu poate fi folosită într-o zonă sigură',
  'skills.unnamed': 'Abilitatea nr. {number}',
  'skills.named': '{name} (Niv.{level})',
  'skills.damage': 'Daunele abilității +{value}',
  'skills.distance': 'Distanță: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Gata în {seconds} s',
  'skills.delay': 'Întârziere: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
