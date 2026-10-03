/** Chinese text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': '强化前请先脱下该装备',
  'item.jewelNotAJewel': '该物品不能用在其他物品上',
  'item.jewelNotUpgradable': '该物品无法强化',
  'item.jewelBlessLimit': '祝福宝石最高只能到 +6',
  'item.jewelSoulLimit': '灵魂宝石最高只能到 +9',
  'item.jewelHarmonyAncient': '和谐宝石不能用于古代物品',
  'item.jewelHarmonySocket': '和谐宝石不能用于镶嵌物品',
  'item.refineStoneSocket': '精炼石不能用于镶嵌物品',
  'item.jewelWrongTarget': '该物品不能用在其他物品上',
  'notify.cannotStore': '这件物品无法存放',
  'notify.cannotTrade': '这件物品无法交易',
  'notify.noInventoryRoom': '背包里没有空间',
  'notify.noRoomForItem': '没有空间存放这件物品',
  'notify.inventorySorted': '背包已整理',
  'notify.itemsMoved': '已移动 {count} 件物品',
  'notify.itemsBought': '已购买 {count} 个',
  'notify.cannotMoveItem': '这件物品不能移到那里',
  'notify.cannotUseItem': '这件物品不能这样使用',
} satisfies Partial<Record<keyof typeof en, string>>;
