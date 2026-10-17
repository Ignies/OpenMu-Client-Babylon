/** ur text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'عام',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'سرگوشی بلاک کریں',
  'chat.system': 'سسٹم پیغامات',
  'chat.log': 'چیٹ ریکارڈ',
  'chat.frame': 'فریم',
  'chat.size': 'سائز',
  'chat.alpha': 'شفافیت',
  'chat.whisperOff': 'سرگوشی بند ہے (F3)',
  'chat.emoji.button': 'ایموجی',
  'chat.emoji.recent': 'حال ہی میں استعمال شدہ',
  'chat.latest': 'تازہ ترین پیغامات پر واپس',
} satisfies Partial<Record<keyof typeof en, string>>;
