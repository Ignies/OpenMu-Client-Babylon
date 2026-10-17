/** eu text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Trebetasun ezezaguna',
  'skills.tooltip.class': 'Zure klaseak ezin du erabili',
  'skills.tooltip.weapon': 'Hura daraman arma behar du',
  'skills.tooltip.cooldown': 'Ez dago prest oraindik',
  'skills.tooltip.level': 'Maila behar da: {level}',
  'skills.tooltip.energy': 'Energia behar da: {energy}',
  'skills.tooltip.mana': 'Ez dago mana nahikorik ({mana})',
  'skills.tooltip.ag': 'Ez dago AG nahikorik ({ag})',
  'skills.tooltip.safezone': 'Ezin da gune seguruan erabili',
  'skills.unnamed': 'Trebetasuna #{number}',
  'skills.named': '{name} (Maila {level})',
  'skills.damage': 'Trebetasun-kaltea +{value}',
  'skills.distance': 'Distantzia: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Prest {seconds} s barru',
  'skills.delay': 'Atzerapena: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
