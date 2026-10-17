/** ar text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': 'عادي',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'حظر الهمس',
  'chat.system': 'رسائل النظام',
  'chat.log': 'سجل الدردشة',
  'chat.frame': 'الإطار',
  'chat.size': 'الحجم',
  'chat.alpha': 'الشفافية',
  'chat.whisperOff': 'الهمس متوقف (F3)',
  'chat.emoji.button': 'الرموز التعبيرية',
  'chat.emoji.recent': 'المستخدمة مؤخرا',
  'chat.latest': 'العودة إلى أحدث الرسائل',
} satisfies Partial<Record<keyof typeof en, string>>;
