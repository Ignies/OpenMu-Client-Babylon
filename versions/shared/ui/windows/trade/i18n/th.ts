/** Thai text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': 'แลกเปลี่ยน',
  'trade.warnCheck': 'ตรวจไอเทมทุกชิ้นก่อนกดยอมรับ',
  'trade.warnAlike': 'ไอเทมอาจดูเหมือนกันแต่ต่างกันได้',
  'trade.warnCancel': 'การยกเลิกจะคืนของทั้งหมด',
  'trade.cancel': 'ยกเลิกการแลกเปลี่ยน',
  'trade.offerZen': 'เสนอเซน',
  'trade.accept': 'ยอมรับการแลกเปลี่ยน',
} satisfies Partial<Record<keyof typeof en, string>>;
