/** id text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Skill tidak dikenal',
  'skills.tooltip.class': 'Tidak dapat dipakai oleh kelasmu',
  'skills.tooltip.weapon': 'Memerlukan senjata yang memberikannya',
  'skills.tooltip.cooldown': 'Belum siap',
  'skills.tooltip.level': 'Memerlukan level {level}',
  'skills.tooltip.energy': 'Memerlukan Energi {energy}',
  'skills.tooltip.mana': 'Mana tidak cukup ({mana})',
  'skills.tooltip.ag': 'AG tidak cukup ({ag})',
  'skills.tooltip.safezone': 'Tidak dapat dipakai di zona aman',
  'skills.unnamed': 'Skill #{number}',
  'skills.named': '{name} (Lv.{level})',
  'skills.damage': 'Damage skill +{value}',
  'skills.distance': 'Jarak: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Siap dalam {seconds} dtk',
  'skills.delay': 'Jeda: {seconds} dtk',
} satisfies Partial<Record<keyof typeof en, string>>;
