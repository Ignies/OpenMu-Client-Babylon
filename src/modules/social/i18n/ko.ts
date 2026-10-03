/** Korean text of the `social` module. */

import type en from './en';

export default {
  'party.left': '파티에서 나왔습니다.',
  'party.onlyLeaderInvites': '파티장만 초대할 수 있습니다.',
  'party.full': '파티가 가득 찼습니다.',
  'party.invitationSent': '{name}님에게 파티 초대를 보냈습니다.',
  'guild.joinRequestSent': '{name}님에게 길드 가입 신청을 보냈습니다.',
  'guild.onlyMasterAppoints': '길드 마스터만 길드원을 임명할 수 있습니다.',
  'guild.onlyMasterCan': '길드 마스터만 할 수 있습니다.',
  'guild.allianceRequestSent': '{name}님에게 연합 신청을 보냈습니다.',
  'guild.hostilityRequestSent': '{name}님에게 적대 선언을 보냈습니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
