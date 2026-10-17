/** uk text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Зніміть предмет, перш ніж покращувати його',
  'item.jewelNotAJewel': 'Цей предмет не можна застосувати до іншого предмета',
  'item.jewelNotUpgradable': 'Цей предмет не можна покращити',
  'item.jewelBlessLimit': 'Jewel of Bless діє лише до +6',
  'item.jewelSoulLimit': 'Jewel of Soul діє лише до +9',
  'item.jewelHarmonyAncient': 'Jewel of Harmony не можна застосувати до предметів Ancient',
  'item.jewelHarmonySocket': 'Jewel of Harmony не можна застосувати до предметів Socket',
  'item.refineStoneSocket': 'Камені очищення не можна застосувати до предметів Socket',
  'item.jewelWrongTarget': 'Цей предмет не можна застосувати до іншого предмета',
  'notify.noInventoryRoom': 'В інвентарі немає місця',
  'notify.noRoomForItem': 'Для цього предмета немає місця',
  'notify.inventorySorted': 'Інвентар упорядковано',
  'notify.itemsMoved': 'Переміщено предметів: {count}',
  'notify.itemsBought': 'Куплено: {count}',
  'notify.cannotMoveItem': 'Цей предмет не можна туди перемістити',
  'notify.cannotUseItem': 'Цей предмет не можна так використати',
  'notify.cannotStore': 'Цей предмет не можна покласти на зберігання',
  'notify.cannotTrade': 'Цей предмет не можна обміняти',
} satisfies Partial<Record<keyof typeof en, string>>;
