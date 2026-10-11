/** Thai text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'ตกลง',
  'common.cancel': 'ยกเลิก',
  'common.close': 'ปิด',
  'common.none': 'ไม่มี',
  'common.create': 'สร้าง',
  'common.creating': 'กำลังสร้าง...',
  'common.send': 'ส่ง',
  'common.sending': 'กำลังส่ง...',
  'common.loading': 'กำลังโหลด...',
  'common.warning': 'คำเตือน',
  'common.level': 'เลเวล',
  'common.offline': 'ออฟไลน์',
  'common.off': 'ปิด',
  'common.zen': 'เซน',
  'common.notEnoughZen': 'เซนไม่พอ',
  'options.quality.classic': 'คลาสสิก',
  'options.quality.enhanced': 'ปรับปรุง',
} satisfies Partial<Record<keyof typeof en, string>>;
