/** Thai text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'โลกนี้ระบุโมดูลที่อ่านไม่ได้ ({id}): ข้าม',
  'moduleStream.api': 'โมดูล {id} ต้องใช้ API โมดูล {range} แต่ไคลเอนต์นี้รองรับ {have}: ข้าม',
  'moduleStream.download': 'ดาวน์โหลดโมดูล {id} ไม่ได้: ข้าม',
  'moduleStream.hash': 'โมดูล {id} ไม่ตรงกับแฮชของมัน: ข้าม',
  'moduleStream.core': 'โมดูล {id} อ้างว่าเป็นโมดูลหลัก: ปฏิเสธ',
  'moduleStream.builtIn': 'โมดูล {id} ใช้ชื่อเดียวกับโมดูลในตัว: ปฏิเสธ',
  'moduleStream.declined': 'โมดูล {id} ไม่ได้รับอนุญาต: ข้าม',
  'moduleStream.failed': 'โมดูล {id} เริ่มทำงานไม่ได้: ถอดออก',
} satisfies Partial<Record<keyof typeof en, string>>;
