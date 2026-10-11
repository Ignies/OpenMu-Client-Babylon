/** Thai text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'กรอกชื่อบัญชีและรหัสผ่าน',
  'login.createAccount': 'สร้างบัญชี',
  'login.rememberMe': 'จำฉันไว้ไหม',

  'register.id': 'ID',
  'register.password': 'รหัสผ่าน',
  'register.confirm': 'ยืนยัน',
  'register.fillEveryField': 'กรุณากรอกทุกช่อง',
  'register.idTooShort': 'ID ต้องมีอย่างน้อย {min} ตัวอักษร',
  'register.idChars': 'ID ใช้ได้เฉพาะตัวอักษรและตัวเลข',
  'register.passwordTooShort': 'รหัสผ่านต้องมีอย่างน้อย {min} ตัวอักษร',

  'register.passwordChars': 'รหัสผ่านใช้ได้เฉพาะตัวอักษร ตัวเลข และสัญลักษณ์พื้นฐานเท่านั้น',
  'register.mismatch': 'รหัสผ่านไม่ตรงกัน',
  'register.unreachable': 'ติดต่อเซิร์ฟเวอร์ไม่ได้',
  'register.failed': 'สมัครไม่สำเร็จ ({status})',
  'register.created': 'สร้างบัญชีแล้ว เข้าสู่ระบบได้เลย',
  'login.savedLogin': 'บันทึกไว้',
} satisfies Partial<Record<keyof typeof en, string>>;
