/** zh-Hant text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': '強化前請先卸下該裝備',
  'item.jewelNotAJewel': '此物品無法用於其他物品',
  'item.jewelNotUpgradable': '此物品無法強化',
  'item.jewelBlessLimit': '祝福寶石最高只能強化到 +6',
  'item.jewelSoulLimit': '靈魂寶石最高只能強化到 +9',
  'item.jewelHarmonyAncient': '再生寶石無法用於套裝物品',
  'item.jewelHarmonySocket': '再生寶石無法用於鑲嵌物品',
  'item.refineStoneSocket': '進化寶石無法用於鑲嵌物品',
  'item.jewelWrongTarget': '此物品無法用於其他物品',
  'notify.cannotStore': '此物品無法存放',
  'notify.cannotTrade': '此物品無法交易',
  'notify.noInventoryRoom': '背包沒有空間',
  'notify.noRoomForItem': '沒有空間放置該物品',
  'notify.inventorySorted': '背包已整理',
  'notify.itemsMoved': '已移動{count}件物品',
  'notify.itemsBought': '已購買{count}個',
  'notify.cannotMoveItem': '無法將該物品移到那裡',
  'notify.cannotUseItem': '該物品無法這樣使用',
} satisfies Partial<Record<keyof typeof en, string>>;
