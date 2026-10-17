/** zh-Hant text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket 連線錯誤',
  'notify.connectionLost': '與伺服器的連線已中斷',
  'notify.serverListLost': '與伺服器列表的連線已中斷',
  'notify.helperStarted': 'MU Helper 已啟動',
  'notify.helperStopped': 'MU Helper 已停止',
  'notify.helperSafeZone': 'MU Helper 無法在安全區內啟動',
  'notify.helperCost': 'MU Helper 已花費{total}金幣',
  'notify.zenCap': '攜帶的金幣不能超過2,000,000,000',
  'notify.cannotSell': '此物品無法出售',
  'notify.merchantRefuses': '商人不收這件物品',
  'notify.learnedSkill': '你學會了{name}',
  'notify.storageOpen': '倉庫開啟時無法使用物品',
  'notify.upgradeNeedsServer': '強化需要連線伺服器',
  'notify.noAnswerRestored': '伺服器沒有回應，物品已復原',
  'notify.cannotBuy': '你無法購買這件物品',
  'notify.updateAvailable': '有新版本：回到伺服器列表後頁面會重新載入。',
} satisfies Partial<Record<keyof typeof en, string>>;
