/** Japanese text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': '強化する前にアイテムを外してください',
  'item.jewelNotAJewel': 'そのアイテムは他のアイテムには使えません',
  'item.jewelNotUpgradable': 'このアイテムは強化できません',
  'item.jewelBlessLimit': 'ブレスの宝石は +6 までです',
  'item.jewelSoulLimit': 'ソウルの宝石は +9 までです',
  'item.jewelHarmonyAncient': 'ハーモニーの宝石は古代アイテムには使えません',
  'item.jewelHarmonySocket': 'ハーモニーの宝石はソケットアイテムには使えません',
  'item.refineStoneSocket': '精錬石はソケットアイテムには使えません',
  'item.jewelWrongTarget': 'このアイテムはほかのアイテムには使えません',
  'notify.cannotStore': 'このアイテムは保管できません',
  'notify.cannotTrade': 'このアイテムは取引できません',
  'notify.noInventoryRoom': 'インベントリに空きがありません',
  'notify.noRoomForItem': 'そのアイテムを入れる空きがありません',
  'notify.inventorySorted': '所持品を整理しました',
  'notify.itemsMoved': '{count} 個のアイテムを移動しました',
  'notify.itemsBought': '{count} 個購入しました',
  'notify.cannotMoveItem': 'そのアイテムはそこへ移せません',
  'notify.cannotUseItem': 'そのアイテムはそのように使えません',
} satisfies Partial<Record<keyof typeof en, string>>;
