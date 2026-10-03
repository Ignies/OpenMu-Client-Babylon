/** Vietnamese text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'Thường',
  'chat.gens': 'Gens',
  'chat.blockWhisper': 'Chặn nói riêng',
  'chat.system': 'Tin nhắn hệ thống',
  'chat.log': 'Nhật ký chat',
  'chat.frame': 'Khung',
  'chat.size': 'Cỡ',
  'chat.alpha': 'Độ trong suốt',
  'chat.whisperOff': 'Đã tắt nói riêng (F3)',
  'chat.emoji.button': 'Emoji',
  'chat.emoji.recent': 'Dùng gần đây',
  'chat.latest': 'Về tin nhắn mới nhất',
} satisfies Partial<Record<keyof typeof en, string>>;
