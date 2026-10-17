/** Chinese text of the `social` module. */

import type en from './en';

export default {
  'party.left': '你离开了队伍。',
  'party.onlyLeaderInvites': '只有队长才能邀请。',
  'party.full': '队伍已满。',
  'party.invitationSent': '已向 {name} 发送组队邀请。',
  'party.reply.on': '组队邀请：会询问你。',
  'party.reply.off': '组队邀请：自动拒绝。输入 /re on 恢复询问。',
  'party.reply.auto': '组队邀请：自动接受。输入 /re on 恢复询问。',
  'party.reply.status': '组队邀请：/re {mode}。可用 /re on、/re off 或 /re auto。',
  'party.reply.declined': '已拒绝 {name} 的组队邀请 (/re)。',
  'party.reply.accepted': '已接受 {name} 的组队邀请 (/re)。',
  'guild.joinRequestSent': '已向 {name} 发送入会申请。',
  'guild.onlyMasterAppoints': '只有会长才能任命成员。',
  'guild.onlyMasterCan': '只有会长才能这么做。',
  'guild.allianceRequestSent': '已向 {name} 发送联盟申请。',
  'guild.hostilityRequestSent': '已向 {name} 发送敌对宣告。',
  'stats.added': '已向{stat}加了{amount}点。',
  'stats.name.str': '力量',
  'stats.name.agi': '敏捷',
  'stats.name.vit': '体力',
  'stats.name.ene': '智力',
  'stats.name.cmd': '统率',
} satisfies Partial<Record<keyof typeof en, string>>;
