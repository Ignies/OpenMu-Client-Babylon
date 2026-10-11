/** Thai text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'ปิดหน้าต่างเคออสก่อนออกจากเกม',
  'exit.noAnswer': 'เซิร์ฟเวอร์ไม่ตอบกลับ กำลังออกจากเกม',
  'resume.done': 'กลับมาออนไลน์แล้ว',
  'resume.failed': 'เชื่อมต่อใหม่ไม่สำเร็จ',
  'resume.cancelled': 'ยกเลิกการเชื่อมต่อใหม่',
  'login.closingOldSession': 'บัญชียังเชื่อมต่ออยู่: กำลังปิดเซสชันเก่าและลองใหม่...',
  'login.tokenRefused': 'การเข้าสู่ระบบที่บันทึกไว้หมดอายุแล้ว กรอกรหัสผ่าน',
} satisfies Partial<Record<keyof typeof en, string>>;
