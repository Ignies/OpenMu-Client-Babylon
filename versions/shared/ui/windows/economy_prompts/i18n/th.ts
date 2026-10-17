/** Thai text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'ฝากเซน',
  'prompt.takeZen': 'ถอนเซน',
  'prompt.unlockVault': 'ปลดล็อกคลัง',
  'prompt.enterPin': 'กรอกรหัสคลัง',
  'prompt.setPin': 'ตั้งรหัสคลัง',
  'prompt.removePin': 'ลบรหัสคลัง',
  'prompt.removePinHint': 'การลบรหัสต้องใช้รหัสผ่านบัญชีของคุณ',
  'prompt.offerZen': 'เสนอเซน',
  'prompt.setPrice': 'ตั้งราคา',
  'prompt.askingPrice': 'ราคาที่ขอ',
  'prompt.askingPriceFor': 'ราคาที่ขอสำหรับ {name}',
  'prompt.buy': 'ซื้อ',
  'prompt.itemCosts': '{name} ราคา {price}',
  'prompt.thisItem': 'ไอเทมนี้',
  'prompt.itemGone': 'ไอเทมนี้ไม่อยู่แล้ว',
  'prompt.buyHowMany': 'ต้องการ {name} กี่ชิ้น? ชิ้นละ {price}',
  'prompt.quantity': 'จำนวน',
  'prompt.carrying': 'คุณพกอยู่ {amount}',
  'prompt.vaultHolds': 'ในคลังมี {amount}',
  'prompt.newPinHint': 'การตั้งรหัสใหม่ต้องใช้รหัสผ่านบัญชีของคุณ',
  'prompt.pin': 'รหัส PIN',
  'prompt.password': 'รหัสผ่าน',
  'prompt.wantsToTrade': '{name} ต้องการแลกเปลี่ยนกับคุณ',
  'prompt.bundle': 'รวม',
  'prompt.bundleAsk': 'ต้องการรวม {name} {count} ชิ้นหรือไม่?',
  'prompt.unbundle': 'แยก',
  'prompt.unbundleAsk': 'ต้องการแยกชุด {name} {count} ชิ้นหรือไม่?',
} satisfies Partial<Record<keyof typeof en, string>>;
