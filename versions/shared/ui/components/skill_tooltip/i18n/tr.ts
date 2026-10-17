/** tr text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Bilinmeyen yetenek',
  'skills.tooltip.class': 'Sınıfın bunu kullanamaz',
  'skills.tooltip.weapon': 'Bu yeteneği veren silah gerekir',
  'skills.tooltip.cooldown': 'Henüz hazır değil',
  'skills.tooltip.level': 'Gereken seviye: {level}',
  'skills.tooltip.energy': 'Gereken enerji: {energy}',
  'skills.tooltip.mana': 'Yetersiz mana ({mana})',
  'skills.tooltip.ag': 'Yetersiz AG ({ag})',
  'skills.tooltip.safezone': 'Güvenli bölgede kullanılamaz',
  'skills.unnamed': 'Yetenek #{number}',
  'skills.named': '{name} (Sv.{level})',
  'skills.damage': 'Yetenek hasarı +{value}',
  'skills.distance': 'Mesafe: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': '{seconds} sn sonra hazır',
  'skills.delay': 'Gecikme: {seconds} sn',
} satisfies Partial<Record<keyof typeof en, string>>;
