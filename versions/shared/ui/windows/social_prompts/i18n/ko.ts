/** Korean text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name}님이 파티에 초대했습니다.',
  'social.guildJoin': '{name}님이 길드 가입을 요청했습니다.',
  'social.guildWar': '{name}님이 길드에 선전포고했습니다.',
  'social.battleSoccer': '{name}님이 길드에 배틀 사커를 신청했습니다.',
  'social.allianceOffer': '{name}님이 길드 연합을 제안했습니다.',
  'social.allianceLeave': '{name}님이 길드 연합에서 나가려 합니다.',
  'social.hostilityDeclare': '{name}님이 양 길드를 적대 관계로 선언했습니다.',
  'social.hostilityEnd': '{name}님이 적대 관계를 끝내려 합니다.',
  'social.friendRequest': '{name}님이 친구 추가를 요청했습니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
