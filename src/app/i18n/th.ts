/** Thai text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'การเชื่อมต่อ WebSocket ผิดพลาด',
  'notify.connectionLost': 'การเชื่อมต่อกับเซิร์ฟเวอร์ขาดหาย',
  'notify.serverListLost': 'การเชื่อมต่อกับรายชื่อเซิร์ฟเวอร์ขาดหาย',
  'notify.helperStarted': 'เริ่ม MU Helper แล้ว',
  'notify.helperStopped': 'หยุด MU Helper แล้ว',
  'notify.helperSafeZone': 'เริ่ม MU Helper ในเขตปลอดภัยไม่ได้',
  'notify.helperCost': 'MU Helper ใช้ไป {total} เซน',
  'notify.zenCap': 'คุณพกเซนได้ไม่เกิน 2,000,000,000',
  'notify.cannotSell': 'ไอเทมนี้ขายไม่ได้',
  'notify.merchantRefuses': 'พ่อค้าไม่รับไอเทมนั้น',
  'notify.learnedSkill': 'คุณเรียนรู้ {name} แล้ว',
  'notify.storageOpen': 'ใช้ไอเทมไม่ได้ขณะเปิดคลัง',
  'notify.upgradeNeedsServer': 'การอัปเกรดต้องใช้เซิร์ฟเวอร์',
  'notify.noAnswerRestored': 'เซิร์ฟเวอร์ไม่ตอบสนอง - คืนไอเทมแล้ว',
  'notify.cannotBuy': 'คุณซื้อไอเทมนั้นไม่ได้',
  'notify.updateAvailable': 'มีเวอร์ชันใหม่: หน้าจะโหลดใหม่เมื่อคุณกลับไปที่รายชื่อเซิร์ฟเวอร์',
} satisfies Partial<Record<keyof typeof en, string>>;
