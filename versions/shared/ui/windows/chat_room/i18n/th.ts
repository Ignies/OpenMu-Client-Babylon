/** Thai text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'ห้องแชท',
  'chatRoom.connecting': 'กำลังเชื่อมต่อเซิร์ฟเวอร์แชท...',
  'chatRoom.closed': 'ตัดการเชื่อมต่อแล้ว',
  'chatRoom.members': 'สมาชิก ({count})',
  'chatRoom.invite': 'เชิญ',
  'chatRoom.inviteEmpty': 'ไม่มีเพื่อนคนอื่นออนไลน์',
  'chatRoom.inputPlaceholder': 'พิมพ์ข้อความ',
  'chatRoom.waiting': 'กำลังรอ {name} เข้าร่วม...',
} satisfies Partial<Record<keyof typeof en, string>>;
