/** Chinese text of the `social` module. */

import type en from './en';

export default {
  'party.left': '你离开了队伍。',
  'party.onlyLeaderInvites': '只有队长才能邀请。',
  'party.full': '队伍已满。',
  'party.invitationSent': '已向 {name} 发送组队邀请。',
  'guild.joinRequestSent': '已向 {name} 发送入会申请。',
  'guild.onlyMasterAppoints': '只有会长才能任命成员。',
  'guild.onlyMasterCan': '只有会长才能这么做。',
  'guild.allianceRequestSent': '已向 {name} 发送联盟申请。',
  'guild.hostilityRequestSent': '已向 {name} 发送敌对宣告。',
} satisfies Partial<Record<keyof typeof en, string>>;
