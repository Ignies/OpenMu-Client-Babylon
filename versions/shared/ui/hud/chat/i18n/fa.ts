/** fa text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'عادی',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'مسدود کردن نجوا',
  'chat.system': 'پیام‌های سیستم',
  'chat.log': 'تاریخچه گفتگو',
  'chat.frame': 'قاب',
  'chat.size': 'اندازه',
  'chat.alpha': 'شفافیت',
  'chat.whisperOff': 'نجوا خاموش است (F3)',
  'chat.emoji.button': 'شکلک‌ها',
  'chat.emoji.recent': 'اخیراً استفاده‌شده',
  'chat.latest': 'بازگشت به تازه‌ترین پیام‌ها',
} satisfies Partial<Record<keyof typeof en, string>>;
