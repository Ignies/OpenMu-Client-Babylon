/** zh-Hant text of `src/modules/social`. */

import type en from './en';

export default {
  'party.left': '你已離開隊伍。',
  'party.onlyLeaderInvites': '只有隊長才能邀請。',
  'party.full': '隊伍已滿。',
  'party.invitationSent': '已向玩家{name}發出組隊邀請。',
  'party.reply.on': '組隊邀請：每次都會詢問你。',
  'party.reply.off': '組隊邀請：自動拒絕。輸入 /re on 恢復詢問。',
  'party.reply.auto': '組隊邀請：自動接受。輸入 /re on 恢復詢問。',
  'party.reply.status': '組隊邀請：/re {mode}。可使用 /re on、/re off 或 /re auto。',
  'party.reply.declined': '已拒絕玩家{name}的組隊邀請（/re）。',
  'party.reply.accepted': '已接受玩家{name}的組隊邀請（/re）。',
  'guild.joinRequestSent': '已向玩家{name}發出加入戰盟申請。',
  'guild.onlyMasterAppoints': '只有盟主才能任命成員。',
  'guild.onlyMasterCan': '只有盟主才能這麼做。',
  'guild.allianceRequestSent': '已向玩家{name}發出結盟申請。',
  'guild.hostilityRequestSent': '已向玩家{name}發出敵對宣告。',
} satisfies Partial<Record<keyof typeof en, string>>;
