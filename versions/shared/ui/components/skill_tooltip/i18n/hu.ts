/** hu text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Ismeretlen képesség',
  'skills.tooltip.class': 'A kasztod nem használhatja',
  'skills.tooltip.weapon': 'A hozzá tartozó fegyver szükséges',
  'skills.tooltip.cooldown': 'Még nem áll készen',
  'skills.tooltip.level': 'Szükséges szint: {level}',
  'skills.tooltip.energy': 'Szükséges energia: {energy}',
  'skills.tooltip.mana': 'Nincs elég mana ({mana})',
  'skills.tooltip.ag': 'Nincs elég AG ({ag})',
  'skills.tooltip.safezone': 'Biztonsági zónában nem használható',
  'skills.unnamed': 'Képesség #{number}',
  'skills.named': '{name} ({level}. szint)',
  'skills.damage': 'Képességsebzés +{value}',
  'skills.distance': 'Hatótáv: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Kész {seconds} mp múlva',
  'skills.delay': 'Késleltetés: {seconds} mp',
} satisfies Partial<Record<keyof typeof en, string>>;
