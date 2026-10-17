/** zh-Hant text of `versions/shared/ui/hud/chat`. */

import type en from './en';

export default {
  'chat.normal': '一般',
  'chat.gens': '家族',
  'chat.blockWhisper': '封鎖密語',
  'chat.system': '系統訊息',
  'chat.log': '聊天紀錄',
  'chat.frame': '邊框',
  'chat.size': '大小',
  'chat.alpha': '透明度',
  'chat.whisperOff': '密語已關閉（F3）',
  'chat.emoji.button': '表情符號',
  'chat.emoji.recent': '最近使用',
  'chat.latest': '回到最新訊息',
} satisfies Partial<Record<keyof typeof en, string>>;
