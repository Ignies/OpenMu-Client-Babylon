/** fa text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'مهارت ناشناخته',
  'skills.tooltip.class': 'کلاس شما نمی‌تواند از آن استفاده کند',
  'skills.tooltip.weapon': 'به سلاحی که آن را دارد نیاز دارد',
  'skills.tooltip.cooldown': 'هنوز آماده نیست',
  'skills.tooltip.level': 'نیاز به سطح {level}',
  'skills.tooltip.energy': 'نیاز به انرژی {energy}',
  'skills.tooltip.mana': 'مانا کافی نیست ({mana})',
  'skills.tooltip.ag': 'AG کافی نیست ({ag})',
  'skills.tooltip.safezone': 'در منطقه امن قابل استفاده نیست',
  'skills.unnamed': 'مهارت شماره {number}',
  'skills.named': '{name} (Lv.{level})',
  'skills.damage': 'آسیب مهارت +{value}',
  'skills.distance': 'فاصله: {value}',
  'skills.mana': 'مانا: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'آماده تا {seconds} ثانیه دیگر',
  'skills.delay': 'تأخیر: {seconds} ثانیه',
} satisfies Partial<Record<keyof typeof en, string>>;
