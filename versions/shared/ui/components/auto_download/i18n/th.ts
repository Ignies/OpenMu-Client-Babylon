/** Thai text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': 'กำลังดาวน์โหลดข้อมูลเกม',
  'autoDownload.done': 'ดาวน์โหลดข้อมูลเกมแล้ว',
  'autoDownload.cancel': 'ยกเลิก',
  'autoDownload.hide': 'ซ่อน (ยังดาวน์โหลดต่อ)',
  'autoDownload.phase.map': 'กำลังโหลดแผนที่: {name}',
  'autoDownload.phase.icons': 'กำลังโหลดไอเท็ม',
  'autoDownload.phase.audio': 'กำลังโหลดเพลงและเสียง',
  'autoDownload.phase.monsters': 'กำลังโหลดตัวละครและมอนสเตอร์',
  'autoDownload.phase.core': 'กำลังโหลดอินเทอร์เฟซและเอฟเฟกต์',
  'autoDownload.left': 'เหลือ {left} MB',
  'autoDownload.received': 'ดาวน์โหลดแล้ว {got} MB จาก {total} MB',
  'autoDownload.screenTitle': 'กำลังเตรียมการผจญภัย',
  'autoDownload.screenText': 'ไฟล์เหล่านี้จะถูกเก็บไว้เพื่อให้เกมครั้งต่อไปโหลดเร็วขึ้น เฉพาะครั้งแรกเท่านั้น',
  'autoDownload.skip': 'เข้าเลย',
  'autoDownload.skipNote': 'การดาวน์โหลดจะดำเนินต่อในเบื้องหลัง หากปิดเกม จะดาวน์โหลดต่อจากจุดที่หยุดไว้',
} satisfies Partial<Record<keyof typeof en, string>>;
