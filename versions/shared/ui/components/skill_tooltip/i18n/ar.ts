/** ar text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'مهارة غير معروفة',
  'skills.tooltip.class': 'لا يمكن لفئتك استخدامها',
  'skills.tooltip.weapon': 'تتطلب السلاح الذي يحملها',
  'skills.tooltip.cooldown': 'ليست جاهزة بعد',
  'skills.tooltip.level': 'تتطلب المستوى {level}',
  'skills.tooltip.energy': 'تتطلب الطاقة {energy}',
  'skills.tooltip.mana': 'لا توجد مانا كافية ({mana})',
  'skills.tooltip.ag': 'لا يوجد AG كاف ({ag})',
  'skills.tooltip.safezone': 'لا يمكن استخدامها في المنطقة الآمنة',
  'skills.unnamed': 'المهارة #{number}',
  'skills.named': '{name} (مستوى {level})',
  'skills.damage': 'ضرر المهارة +{value}',
  'skills.distance': 'المدى: {value}',
  'skills.mana': 'المانا: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'جاهزة خلال {seconds} ث',
  'skills.delay': 'التأخير: {seconds} ث',
} satisfies Partial<Record<keyof typeof en, string>>;
