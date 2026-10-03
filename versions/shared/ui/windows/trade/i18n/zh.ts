/** Chinese text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': '交易',
  'trade.warnCheck': '接受前请检查每一件物品。',
  'trade.warnAlike': '外观相似的物品可能并不相同。',
  'trade.warnCancel': '取消交易会把东西全部退还。',
  'trade.cancel': '取消交易',
  'trade.offerZen': '提供金币',
  'trade.accept': '接受交易',
} satisfies Partial<Record<keyof typeof en, string>>;
