/** Chinese text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket 连接错误',
  'notify.connectionLost': '与服务器的连接已断开',
  'notify.serverListLost': '与服务器列表的连接已断开',
  'notify.helperStarted': '自动挂机已启动',
  'notify.helperStopped': '自动挂机已停止',
  'notify.helperSafeZone': '安全区内无法启动自动挂机',
  'notify.helperCost': '自动挂机已消耗 {total} 金币',
  'notify.zenCap': '携带的金币不能超过 2,000,000,000',
  'notify.cannotSell': '这件物品无法出售',
  'notify.merchantRefuses': '商人不收这件物品',
  'notify.learnedSkill': '你学会了 {name}',
  'notify.storageOpen': '仓库打开时无法使用物品',
  'notify.upgradeNeedsServer': '强化需要连接服务器',
  'notify.noAnswerRestored': '服务器没有响应 - 物品已还原',
  'notify.cannotBuy': '你无法购买这件物品',
  'notify.updateAvailable': '有新版本：回到服务器列表后页面会重新加载。',
} satisfies Partial<Record<keyof typeof en, string>>;
