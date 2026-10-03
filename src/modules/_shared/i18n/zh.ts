/** Chinese text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': '个人商店需要 6 级。',
  'personalShop.openFailed': '商店无法开启。',
  'personalShop.cannotSell': '这件物品无法在商店出售。',
  'personalShop.itemGone': '那件物品已经没有了。',
  'guild.alreadyInGuild': '你已经属于某个公会。',
  'guild.notGuildMaster': '该玩家不是公会会长。',
  'guild.requestFailed': '公会请求失败。',
  'quest.itemFallback': '物品 {id}',
  'event.shortOfZen': '你的金币不足。',
  'notify.negativePrice': '价格不能为负数',
} satisfies Partial<Record<keyof typeof en, string>>;
