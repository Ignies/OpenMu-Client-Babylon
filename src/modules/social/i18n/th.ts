/** Thai text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'คุณออกจากปาร์ตี้แล้ว',
  'party.onlyLeaderInvites': 'มีเพียงหัวหน้าปาร์ตี้ที่เชิญได้',
  'party.full': 'ปาร์ตี้เต็มแล้ว',
  'party.invitationSent': 'ส่งคำเชิญปาร์ตี้ถึง {name} แล้ว',
  'party.reply.on': 'คำเชิญปาร์ตี้: จะถามคุณก่อน',
  'party.reply.off': 'คำเชิญปาร์ตี้: ปฏิเสธเอง พิมพ์ /re on เพื่อให้ถามอีกครั้ง',
  'party.reply.auto': 'คำเชิญปาร์ตี้: ตอบรับเอง พิมพ์ /re on เพื่อให้ถามอีกครั้ง',
  'party.reply.status': 'คำเชิญปาร์ตี้: /re {mode} ใช้ /re on, /re off หรือ /re auto',
  'party.reply.declined': 'ปฏิเสธคำเชิญปาร์ตี้จาก {name} แล้ว (/re)',
  'party.reply.accepted': 'ตอบรับคำเชิญปาร์ตี้จาก {name} แล้ว (/re)',
  'guild.joinRequestSent': 'ส่งคำขอเข้ากิลด์ถึง {name} แล้ว',
  'guild.onlyMasterAppoints': 'มีเพียงหัวหน้ากิลด์ที่แต่งตั้งสมาชิกได้',
  'guild.onlyMasterCan': 'มีเพียงหัวหน้ากิลด์ที่ทำได้',
  'guild.allianceRequestSent': 'ส่งคำขอพันธมิตรถึง {name} แล้ว',
  'guild.hostilityRequestSent': 'ส่งการประกาศเป็นศัตรูถึง {name} แล้ว',
} satisfies Partial<Record<keyof typeof en, string>>;
