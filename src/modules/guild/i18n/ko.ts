/** Korean text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name}님이 길드를 떠났습니다.',
  'guild.youLeft': '길드에서 나왔습니다.',
  'guild.disbanded': '길드가 해체되었습니다.',
  'guild.memberRemoved': '길드원이 길드에서 제명되었습니다.',
  'guild.onlyMasterRemoves': '길드 마스터만 길드원을 제명할 수 있습니다.',
  'guild.wrongPassword': '입력한 암호가 올바르지 않습니다.',
  'guild.created': '길드가 창설되었습니다.',
  'guild.nameTaken': '그 길드 이름은 이미 사용 중입니다.',
  'guild.createFailed': '길드를 창설하지 못했습니다.',
  'guild.joinRefused': '길드 마스터가 신청을 거절했습니다.',
  'guild.joined': '길드에 가입했습니다.',
  'guild.isFull': '길드가 가득 찼습니다.',
  'guild.masterUnavailable': '길드 마스터와 연결할 수 없습니다.',
  'guild.masterBusy': '길드 마스터가 바쁩니다. 나중에 다시 시도하세요.',
  'guild.needLevel6': '길드에 들어가려면 레벨 6 이상이어야 합니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
