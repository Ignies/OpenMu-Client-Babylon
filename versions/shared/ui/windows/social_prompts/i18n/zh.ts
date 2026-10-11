/** Chinese text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} 邀请你加入队伍。',
  'social.guildJoin': '{name} 申请加入你的公会。',
  'social.guildWar': '{name} 向你的公会宣战。',
  'social.battleSoccer': '{name} 向你的公会发起公会足球赛。',
  'social.allianceOffer': '{name} 提议结成公会联盟。',
  'social.allianceLeave': '{name} 想退出公会联盟。',
  'social.hostilityDeclare': '{name} 宣布你们的公会为敌对关系。',
  'social.hostilityEnd': '{name} 想解除敌对关系。',
  'social.friendRequest': '{name} 想加你为好友。',
} satisfies Partial<Record<keyof typeof en, string>>;
