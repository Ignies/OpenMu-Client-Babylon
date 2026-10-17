/** zh-Hant text of `versions/shared/ui/windows/party`. */

import type en from './en';

export default {
  'party.title': '隊伍',
  'party.leader': '隊長',
  'party.leave': '離開隊伍',
  'party.kick': '踢出玩家{name}',
  'party.nearby': '附近的玩家',
  'party.nearbyEmpty': '站在玩家旁邊即可邀請。',
  'party.tradeWith': '與玩家{name}交易',
  'party.notInParty': '你不在隊伍中。',
  'party.invite': '邀請',
  'party.shop': '商店',
} satisfies Partial<Record<keyof typeof en, string>>;
