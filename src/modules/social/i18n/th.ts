/** Thai text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'คุณออกจากปาร์ตี้แล้ว',
  'party.onlyLeaderInvites': 'มีเพียงหัวหน้าปาร์ตี้ที่เชิญได้',
  'party.full': 'ปาร์ตี้เต็มแล้ว',
  'party.invitationSent': 'ส่งคำเชิญปาร์ตี้ถึง {name} แล้ว',
  'guild.joinRequestSent': 'ส่งคำขอเข้ากิลด์ถึง {name} แล้ว',
  'guild.onlyMasterAppoints': 'มีเพียงหัวหน้ากิลด์ที่แต่งตั้งสมาชิกได้',
  'guild.onlyMasterCan': 'มีเพียงหัวหน้ากิลด์ที่ทำได้',
  'guild.allianceRequestSent': 'ส่งคำขอพันธมิตรถึง {name} แล้ว',
  'guild.hostilityRequestSent': 'ส่งการประกาศเป็นศัตรูถึง {name} แล้ว',
} satisfies Partial<Record<keyof typeof en, string>>;
