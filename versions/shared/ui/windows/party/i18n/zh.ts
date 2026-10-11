/** Chinese text of the `party` window. */

import type en from './en';

export default {
  'party.title': '队伍',
  'party.leader': '队长',
  'party.leave': '离开队伍',
  'party.kick': '踢出 {name}',
  'party.nearby': '附近的玩家',
  'party.nearbyEmpty': '站到玩家旁边即可邀请。',
  'party.tradeWith': '与 {name} 交易',
  'party.notInParty': '你不在队伍中。',
  'party.invite': '邀请',
  'party.shop': '商店',
} satisfies Partial<Record<keyof typeof en, string>>;
