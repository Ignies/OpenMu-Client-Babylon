/** ur text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'چیٹ روم',
  'chatRoom.connecting': 'چیٹ سرور سے جڑ رہے ہیں...',
  'chatRoom.closed': 'کنکشن منقطع',
  'chatRoom.members': 'اراکین ({count})',
  'chatRoom.invite': 'دعوت دیں',
  'chatRoom.inviteEmpty': 'کوئی اور دوست آن لائن نہیں۔',
  'chatRoom.inputPlaceholder': 'پیغام لکھیں',
  'chatRoom.waiting': 'کھلاڑی {name} کے شامل ہونے کا انتظار...',
} satisfies Partial<Record<keyof typeof en, string>>;
