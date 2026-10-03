/** Thai text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'กำลังโหลดรายชื่อเซิร์ฟเวอร์...',
  'servers.serverName': 'เซิร์ฟเวอร์ {number}',
  'login.id': 'ไอดี',
  'login.password': 'รหัสผ่าน',

  'options.title': 'ตัวเลือก',
  'options.texturePack': 'พื้นผิวโมเดล',
  'options.texturePack.original': 'ต้นฉบับ',
  'options.texturePackHint': 'พื้นผิวโมเดลความละเอียดสูง ใช้งานได้โดยไม่ต้องโหลดใหม่',
  'session.toLevel': 'ถึงเลเวล',
  'bottomBar.pet.normalTip': 'ปกติ: อีกาอยู่ข้างคุณ',
  'bottomBar.pet.randomTip': 'สุ่ม: โจมตีสิ่งที่อยู่ใกล้',
  'bottomBar.pet.ownerTip': 'เจ้าของ: โจมตีสิ่งที่คุณโจมตี',
  'bottomBar.pet.targetTip': 'เป้าหมาย: โจมตีเป้าหมายปัจจุบันของคุณ',

  'skills.title': 'สกิล',
  'skills.empty': 'ยังไม่ได้เรียนสกิล',
  'chatRoom.leave': 'ออก',
  'command.trade': 'แลกเปลี่ยน',
  'command.purchase': 'ซื้อ',
  'command.party': 'ปาร์ตี้',
  'command.whisper': 'กระซิบ',
  'command.follow': 'ติดตาม',
  'command.battle': 'ประลอง',
  'warp.title': 'หน้าต่างคำสั่งวาร์ป',
  'instrument.putAway': 'เก็บ',
  'prompt.trade': 'แลกเปลี่ยน',
} satisfies Partial<Record<keyof typeof en, string>>;
