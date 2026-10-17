/** zh-Hant text of `versions/shared/ui/windows/social_prompts`. */

import type en from './en';

export default {
  'social.partyInvite': '玩家{name}邀請你加入隊伍。',
  'social.guildJoin': '玩家{name}申請加入你的戰盟。',
  'social.guildWar': '玩家{name}向你的戰盟宣戰。',
  'social.battleSoccer': '玩家{name}向你的戰盟發起戰盟足球賽。',
  'social.allianceOffer': '玩家{name}提議結成戰盟聯盟。',
  'social.allianceLeave': '玩家{name}想退出戰盟聯盟。',
  'social.hostilityDeclare': '玩家{name}宣告與你的戰盟敵對。',
  'social.hostilityEnd': '玩家{name}想解除敵對關係。',
  'social.friendRequest': '玩家{name}想加你為好友。',
} satisfies Partial<Record<keyof typeof en, string>>;
