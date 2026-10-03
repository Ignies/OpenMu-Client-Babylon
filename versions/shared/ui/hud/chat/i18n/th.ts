/** Thai text of the `chat` HUD element. */

import type en from './en';

export default {
  'chat.normal': 'ทั่วไป',
  'chat.gens': 'เก็นส์',
  'chat.blockWhisper': 'ปิดกั้นข้อความกระซิบ',
  'chat.system': 'ข้อความระบบ',
  'chat.log': 'บันทึกแชท',
  'chat.frame': 'กรอบ',
  'chat.size': 'ขนาด',
  'chat.alpha': 'ความโปร่งใส',
  'chat.whisperOff': 'ปิดข้อความกระซิบอยู่ (F3)',
  'chat.emoji.button': 'อีโมจิ',
  'chat.emoji.recent': 'ใช้ล่าสุด',
  'chat.latest': 'กลับไปที่ข้อความล่าสุด',
} satisfies Partial<Record<keyof typeof en, string>>;
