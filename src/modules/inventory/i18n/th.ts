/** Thai text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'ถอดไอเทมออกก่อนอัปเกรด',
  'item.jewelNotAJewel': 'ไอเทมนี้ใช้กับไอเทมอื่นไม่ได้',
  'item.jewelNotUpgradable': 'ไอเทมนั้นอัปเกรดไม่ได้',
  'item.jewelBlessLimit': 'Jewel of Bless ใช้ได้ถึง +6 เท่านั้น',
  'item.jewelSoulLimit': 'Jewel of Soul ใช้ได้ถึง +9 เท่านั้น',
  'item.jewelHarmonyAncient': 'Jewel of Harmony ใช้กับไอเทม Ancient ไม่ได้',
  'item.jewelHarmonySocket': 'Jewel of Harmony ใช้กับไอเทมซ็อกเก็ตไม่ได้',
  'item.refineStoneSocket': 'หินกลั่นใช้กับไอเทมซ็อกเก็ตไม่ได้',
  'item.jewelWrongTarget': 'ไอเทมนั้นใช้กับไอเทมอื่นไม่ได้',
  'notify.cannotStore': 'ไอเทมนี้เก็บไม่ได้',
  'notify.cannotTrade': 'ไอเทมนี้แลกเปลี่ยนไม่ได้',
  'notify.noInventoryRoom': 'กระเป๋าไม่มีที่ว่าง',
  'notify.noRoomForItem': 'ไม่มีที่ว่างสำหรับไอเทมนั้น',
  'notify.inventorySorted': 'จัดกระเป๋าเรียบร้อย',
  'notify.itemsMoved': 'ย้ายไอเทม {count} ชิ้น',
  'notify.itemsBought': 'ซื้อแล้ว {count} ชิ้น',
  'notify.cannotMoveItem': 'ย้ายไอเทมนั้นไปตรงนั้นไม่ได้',
  'notify.cannotUseItem': 'ใช้ไอเทมนั้นแบบนั้นไม่ได้',
} satisfies Partial<Record<keyof typeof en, string>>;
