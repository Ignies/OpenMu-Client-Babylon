/** zh-Hant text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': '存入金幣',
  'prompt.takeZen': '取出金幣',
  'prompt.unlockVault': '解鎖倉庫',
  'prompt.enterPin': '請輸入倉庫密碼。',
  'prompt.setPin': '設定倉庫密碼',
  'prompt.removePin': '移除倉庫密碼',
  'prompt.removePinHint': '移除倉庫密碼需要帳號密碼。',
  'prompt.offerZen': '提出金幣',
  'prompt.setPrice': '設定價格',
  'prompt.askingPrice': '售價。',
  'prompt.askingPriceFor': '{name}的售價。',
  'prompt.buy': '購買',
  'prompt.itemCosts': '{name}的價格為{price}。',
  'prompt.thisItem': '這件物品',
  'prompt.itemGone': '這件物品已不存在。',
  'prompt.buyHowMany': '要購買幾個{name}？每個{price}。',
  'prompt.quantity': '數量',
  'prompt.carrying': '你身上有{amount}。',
  'prompt.vaultHolds': '倉庫中有{amount}。',
  'prompt.newPinHint': '設定新密碼需要帳號密碼。',
  'prompt.pin': '倉庫密碼',
  'prompt.password': '密碼',
  'prompt.wantsToTrade': '玩家{name}想與你交易。',
  'prompt.bundle': '合成',
  'prompt.bundleAsk': '要將{count}個{name}合成一組嗎？',
  'prompt.unbundle': '拆解',
  'prompt.unbundleAsk': '要拆解{count}個{name}的寶石組嗎？',
} satisfies Partial<Record<keyof typeof en, string>>;
