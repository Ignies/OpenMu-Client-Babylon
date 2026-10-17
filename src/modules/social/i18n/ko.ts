/** Korean text of the `social` module. */

import type en from './en';

export default {
  'party.left': '파티에서 나왔습니다.',
  'party.onlyLeaderInvites': '파티장만 초대할 수 있습니다.',
  'party.full': '파티가 가득 찼습니다.',
  'party.invitationSent': '{name}님에게 파티 초대를 보냈습니다.',
  'party.reply.on': '파티 초대: 확인을 요청합니다.',
  'party.reply.off': '파티 초대: 자동으로 거절합니다. 다시 확인하려면 /re on.',
  'party.reply.auto': '파티 초대: 자동으로 수락합니다. 다시 확인하려면 /re on.',
  'party.reply.status': '파티 초대: /re {mode}. /re on, /re off, /re auto 중에서 고르세요.',
  'party.reply.declined': '{name}의 파티 초대를 거절했습니다 (/re).',
  'party.reply.accepted': '{name}의 파티 초대를 수락했습니다 (/re).',
  'guild.joinRequestSent': '{name}님에게 길드 가입 신청을 보냈습니다.',
  'guild.onlyMasterAppoints': '길드 마스터만 길드원을 임명할 수 있습니다.',
  'guild.onlyMasterCan': '길드 마스터만 할 수 있습니다.',
  'guild.allianceRequestSent': '{name}님에게 연합 신청을 보냈습니다.',
  'guild.hostilityRequestSent': '{name}님에게 적대 선언을 보냈습니다.',
  'stats.added': '{stat}에 {amount} 포인트를 추가했습니다.',
  'stats.name.str': '힘',
  'stats.name.agi': '민첩',
  'stats.name.vit': '체력',
  'stats.name.ene': '에너지',
  'stats.name.cmd': '통솔',
} satisfies Partial<Record<keyof typeof en, string>>;
