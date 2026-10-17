/** fil text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Di-kilalang skill',
  'skills.tooltip.class': 'Hindi magagamit ng iyong klase',
  'skills.tooltip.weapon': 'Kailangan ang armas na may dala nito',
  'skills.tooltip.cooldown': 'Hindi pa handa',
  'skills.tooltip.level': 'Kailangan ang level {level}',
  'skills.tooltip.energy': 'Kailangan ang enerhiya {energy}',
  'skills.tooltip.mana': 'Kulang ang mana ({mana})',
  'skills.tooltip.ag': 'Kulang ang AG ({ag})',
  'skills.tooltip.safezone': 'Hindi magagamit sa ligtas na lugar',
  'skills.unnamed': 'Skill #{number}',
  'skills.named': '{name} (Lv.{level})',
  'skills.damage': 'Pinsala ng skill +{value}',
  'skills.distance': 'Layo: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Handa sa loob ng {seconds} s',
  'skills.delay': 'Pagitan: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
