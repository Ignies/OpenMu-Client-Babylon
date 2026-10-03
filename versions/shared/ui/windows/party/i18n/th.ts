/** Thai text of the `party` window. */

import type en from './en';

export default {
  'party.title': 'ปาร์ตี้',
  'party.leader': 'หัวหน้าปาร์ตี้',
  'party.leave': 'ออกจากปาร์ตี้',
  'party.kick': 'เตะ {name}',
  'party.nearby': 'ผู้เล่นใกล้เคียง',
  'party.nearbyEmpty': 'ยืนข้างผู้เล่นเพื่อเชิญเข้าปาร์ตี้',
  'party.tradeWith': 'แลกเปลี่ยนกับ {name}',
  'party.notInParty': 'คุณไม่ได้อยู่ในปาร์ตี้',
  'party.invite': 'เชิญ',
  'party.shop': 'ร้านค้า',
} satisfies Partial<Record<keyof typeof en, string>>;
