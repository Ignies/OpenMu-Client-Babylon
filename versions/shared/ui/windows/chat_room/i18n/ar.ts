/** ar text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'غرفة الدردشة',
  'chatRoom.connecting': 'جار الاتصال بخادم الدردشة...',
  'chatRoom.closed': 'انقطع الاتصال',
  'chatRoom.members': 'الأعضاء ({count})',
  'chatRoom.invite': 'دعوة',
  'chatRoom.inviteEmpty': 'لا يوجد أصدقاء آخرون متصلون.',
  'chatRoom.inputPlaceholder': 'اكتب رسالة',
  'chatRoom.waiting': 'في انتظار انضمام اللاعب {name}...',
} satisfies Partial<Record<keyof typeof en, string>>;
