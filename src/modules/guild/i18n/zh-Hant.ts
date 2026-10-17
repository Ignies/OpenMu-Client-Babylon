/** zh-Hant text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': '玩家{name}離開了戰盟。',
  'guild.youLeft': '你已離開戰盟。',
  'guild.disbanded': '戰盟已解散。',
  'guild.memberRemoved': '該成員已被逐出戰盟。',
  'guild.onlyMasterRemoves': '只有盟主才能逐出成員。',
  'guild.wrongPassword': '你輸入的密碼不正確。',
  'guild.created': '戰盟已成立。',
  'guild.nameTaken': '此戰盟名稱已被使用。',
  'guild.createFailed': '無法成立戰盟。',
  'guild.joinRefused': '盟主拒絕了你的申請。',
  'guild.joined': '你已加入戰盟。',
  'guild.isFull': '戰盟人數已滿。',
  'guild.masterUnavailable': '盟主目前不在。',
  'guild.masterBusy': '盟主正在忙，請稍後再試。',
  'guild.needLevel6': '等級至少需要6才能加入戰盟。',
} satisfies Partial<Record<keyof typeof en, string>>;
