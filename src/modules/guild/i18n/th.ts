/** Thai text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} ออกจากกิลด์แล้ว',
  'guild.youLeft': 'คุณออกจากกิลด์แล้ว',
  'guild.disbanded': 'กิลด์ถูกยุบแล้ว',
  'guild.memberRemoved': 'สมาชิกถูกปลดออกจากกิลด์แล้ว',
  'guild.onlyMasterRemoves': 'มีเพียงหัวหน้ากิลด์ที่ปลดสมาชิกได้',
  'guild.wrongPassword': 'รหัสผ่านที่ใส่ไม่ถูกต้อง',
  'guild.created': 'สร้างกิลด์เรียบร้อยแล้ว',
  'guild.nameTaken': 'ชื่อกิลด์นี้ถูกใช้แล้ว',
  'guild.createFailed': 'สร้างกิลด์ไม่สำเร็จ',
  'guild.joinRefused': 'หัวหน้ากิลด์ปฏิเสธคำขอของคุณ',
  'guild.joined': 'คุณเข้ากิลด์แล้ว',
  'guild.isFull': 'กิลด์เต็มแล้ว',
  'guild.masterUnavailable': 'ติดต่อหัวหน้ากิลด์ไม่ได้',
  'guild.masterBusy': 'หัวหน้ากิลด์ไม่ว่าง ลองใหม่ภายหลัง',
  'guild.needLevel6': 'ต้องมีเลเวล 6 ขึ้นไปจึงจะเข้ากิลด์ได้',
} satisfies Partial<Record<keyof typeof en, string>>;
