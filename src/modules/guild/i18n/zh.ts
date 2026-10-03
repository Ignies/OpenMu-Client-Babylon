/** Chinese text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} 离开了公会。',
  'guild.youLeft': '你离开了公会。',
  'guild.disbanded': '公会已解散。',
  'guild.memberRemoved': '该成员已被逐出公会。',
  'guild.onlyMasterRemoves': '只有会长才能踢出成员。',
  'guild.wrongPassword': '你输入的密码不正确。',
  'guild.created': '公会已创建。',
  'guild.nameTaken': '该公会名称已被占用。',
  'guild.createFailed': '公会创建失败。',
  'guild.joinRefused': '会长拒绝了你的申请。',
  'guild.joined': '你加入了公会。',
  'guild.isFull': '公会人数已满。',
  'guild.masterUnavailable': '会长当前不可用。',
  'guild.masterBusy': '会长正忙，请稍后再试。',
  'guild.needLevel6': '加入公会至少需要 6 级。',
} satisfies Partial<Record<keyof typeof en, string>>;
