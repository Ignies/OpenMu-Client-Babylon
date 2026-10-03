/** Chinese text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': '普通',
  'chat.gens': '门派',
  'chat.blockWhisper': '屏蔽密语',
  'chat.system': '系统消息',
  'chat.log': '聊天记录',
  'chat.frame': '边框',
  'chat.size': '大小',
  'chat.alpha': '透明度',
  'chat.whisperOff': '密语已关闭（F3）',
  'chat.emoji.button': '表情符号',
  'chat.emoji.recent': '最近使用',
  'chat.latest': '回到最新消息',
} satisfies Partial<Record<keyof typeof en, string>>;
