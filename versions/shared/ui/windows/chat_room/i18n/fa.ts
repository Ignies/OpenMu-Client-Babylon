/** fa text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'اتاق گفتگو',
  'chatRoom.connecting': 'در حال اتصال به سرور گفتگو...',
  'chatRoom.closed': 'قطع شد',
  'chatRoom.members': 'اعضا ({count})',
  'chatRoom.invite': 'دعوت',
  'chatRoom.inviteEmpty': 'دوست دیگری آنلاین نیست.',
  'chatRoom.inputPlaceholder': 'پیامی بنویسید',
  'chatRoom.waiting': 'در انتظار پیوستن بازیکن {name}...',
} satisfies Partial<Record<keyof typeof en, string>>;
