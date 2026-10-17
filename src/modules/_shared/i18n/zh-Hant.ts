/** zh-Hant text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': '開設個人商店需要角色等級6。',
  'personalShop.openFailed': '無法開啟商店。',
  'personalShop.cannotSell': '此物品無法在商店出售。',
  'personalShop.itemGone': '該物品已不存在。',
  'guild.alreadyInGuild': '你已經加入了戰盟。',
  'guild.notGuildMaster': '該玩家不是盟主。',
  'guild.requestFailed': '戰盟申請失敗。',
  'quest.itemFallback': '物品{id}',
  'event.shortOfZen': '你的金幣不足。',
  'notify.negativePrice': '價格不能為負數',
} satisfies Partial<Record<keyof typeof en, string>>;
