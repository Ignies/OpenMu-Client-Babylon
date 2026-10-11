/** Thai text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'คุณเพิ่มตัวเองเป็นเพื่อนไม่ได้',
  'friends.alreadyOnList': '{name} อยู่ในรายชื่อเพื่อนของคุณแล้ว',
  'friends.listFull': 'รายชื่อเพื่อนของคุณเต็มแล้ว',
  'friends.requestSent': 'ส่งคำขอเป็นเพื่อนถึง {name} แล้ว',
  'friends.requestFailed': 'ส่งคำขอเป็นเพื่อนไม่สำเร็จ',
  'friends.added': 'เพิ่ม {name} ในรายชื่อเพื่อนแล้ว',
  'friends.cannotLetterSelf': 'คุณส่งจดหมายถึงตัวเองไม่ได้',
  'friends.letterArrived': 'มีจดหมายจาก {name}',
  'friends.letterDeleteFailed': 'ลบจดหมายไม่สำเร็จ',
  'friends.letterSent': 'ส่งจดหมายแล้ว',
  'friends.letterTryAgain': 'ส่งจดหมายไม่สำเร็จ ลองอีกครั้ง',
  'friends.mailboxFull': 'กล่องจดหมายนั้นเต็มแล้ว',
  'friends.noSuchCharacter': 'ไม่มีตัวละครชื่อนี้',
  'friends.letterNeedsZen': 'เซนไม่พอสำหรับส่งจดหมาย',
  'friends.letterFailed': 'ส่งจดหมายไม่สำเร็จ',
} satisfies Partial<Record<keyof typeof en, string>>;
