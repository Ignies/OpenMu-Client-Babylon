/** Thai text of the `reconnect_overlay` UI component. */

import type en from './en';

export default {
  'resume.title': 'การเชื่อมต่อหลุด',
  'resume.connecting': 'กำลังเชื่อมต่อใหม่... (ครั้งที่ {attempt})',
  'resume.loggingIn': 'กำลังเข้าสู่ระบบอีกครั้ง...',
  'resume.selecting': 'กำลังเข้าสู่โลก...',
  'resume.cancel': 'ยกเลิก',
} satisfies Partial<Record<keyof typeof en, string>>;
