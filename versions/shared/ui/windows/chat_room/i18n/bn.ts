/** bn text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'চ্যাট রুম',
  'chatRoom.connecting': 'চ্যাট সার্ভারে সংযোগ হচ্ছে...',
  'chatRoom.closed': 'সংযোগ বিচ্ছিন্ন',
  'chatRoom.members': 'সদস্য ({count})',
  'chatRoom.invite': 'আমন্ত্রণ',
  'chatRoom.inviteEmpty': 'আর কোনো বন্ধু অনলাইনে নেই।',
  'chatRoom.inputPlaceholder': 'একটি বার্তা লিখুন',
  'chatRoom.waiting': 'খেলোয়াড় {name} যোগ দেওয়ার অপেক্ষা...',
} satisfies Partial<Record<keyof typeof en, string>>;
