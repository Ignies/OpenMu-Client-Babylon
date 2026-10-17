/** ur text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'نامعلوم سکل',
  'skills.tooltip.class': 'آپ کی کلاس استعمال نہیں کر سکتی',
  'skills.tooltip.weapon': 'اس سکل والا ہتھیار درکار ہے',
  'skills.tooltip.cooldown': 'ابھی تیار نہیں',
  'skills.tooltip.level': 'لیول {level} درکار',
  'skills.tooltip.energy': 'انرجی {energy} درکار',
  'skills.tooltip.mana': 'مانا کافی نہیں ({mana})',
  'skills.tooltip.ag': 'AG کافی نہیں ({ag})',
  'skills.tooltip.safezone': 'محفوظ علاقے میں استعمال نہیں ہو سکتی',
  'skills.unnamed': 'سکل #{number}',
  'skills.named': '{name} (لیول {level})',
  'skills.damage': 'سکل نقصان +{value}',
  'skills.distance': 'فاصلہ: {value}',
  'skills.mana': 'مانا: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': '{seconds} سیکنڈ میں تیار',
  'skills.delay': 'وقفہ: {seconds} سیکنڈ',
} satisfies Partial<Record<keyof typeof en, string>>;
