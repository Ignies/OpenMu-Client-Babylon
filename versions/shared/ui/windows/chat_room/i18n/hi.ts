/** hi text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'चैट रूम',
  'chatRoom.connecting': 'चैट सर्वर से कनेक्ट हो रहा है...',
  'chatRoom.closed': 'डिस्कनेक्ट',
  'chatRoom.members': 'सदस्य ({count})',
  'chatRoom.invite': 'न्योता दें',
  'chatRoom.inviteEmpty': 'कोई और दोस्त ऑनलाइन नहीं है।',
  'chatRoom.inputPlaceholder': 'संदेश लिखें',
  'chatRoom.waiting': 'खिलाड़ी {name} के जुड़ने का इंतज़ार...',
} satisfies Partial<Record<keyof typeof en, string>>;
