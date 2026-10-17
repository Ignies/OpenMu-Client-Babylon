/** cs text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Neznámá dovednost',
  'skills.tooltip.class': 'Tvoje povolání ji nemůže použít',
  'skills.tooltip.weapon': 'Vyžaduje zbraň, která ji poskytuje',
  'skills.tooltip.cooldown': 'Ještě není připravena',
  'skills.tooltip.level': 'Vyžaduje úroveň {level}',
  'skills.tooltip.energy': 'Vyžaduje energii {energy}',
  'skills.tooltip.mana': 'Nedostatek many ({mana})',
  'skills.tooltip.ag': 'Nedostatek AG ({ag})',
  'skills.tooltip.safezone': 'Nelze použít v bezpečné zóně',
  'skills.unnamed': 'Dovednost č. {number}',
  'skills.named': '{name} (Úr. {level})',
  'skills.damage': 'Poškození dovednosti +{value}',
  'skills.distance': 'Dosah: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Připravena za {seconds} s',
  'skills.delay': 'Prodleva: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
