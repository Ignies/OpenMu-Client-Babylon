/** Chinese text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': '存入金币',
  'prompt.takeZen': '取出金币',
  'prompt.unlockVault': '解锁仓库',
  'prompt.enterPin': '请输入仓库密码。',
  'prompt.setPin': '设置仓库密码',
  'prompt.removePin': '移除仓库密码',
  'prompt.removePinHint': '移除密码需要账号密码。',
  'prompt.offerZen': '提供金币',
  'prompt.setPrice': '设置价格',
  'prompt.askingPrice': '售价。',
  'prompt.askingPriceFor': '{name} 的售价。',
  'prompt.buy': '购买',
  'prompt.itemCosts': '{name} 售价 {price}。',
  'prompt.thisItem': '这件物品',
  'prompt.itemGone': '这件物品已经没有了。',
  'prompt.buyHowMany': '要买多少个{name}？每个 {price}。',
  'prompt.quantity': '数量',
  'prompt.carrying': '你身上有 {amount}。',
  'prompt.vaultHolds': '仓库中有 {amount}。',
  'prompt.newPinHint': '设置新密码需要账号密码。',
  'prompt.pin': 'PIN 码',
  'prompt.password': '密码',
  'prompt.wantsToTrade': '{name} 想和你交易。',
  'prompt.bundle': '打包',
  'prompt.bundleAsk': '要将{count}个{name}打包吗？',
  'prompt.unbundle': '拆包',
  'prompt.unbundleAsk': '要拆开{count}个{name}的包吗？',
} satisfies Partial<Record<keyof typeof en, string>>;
