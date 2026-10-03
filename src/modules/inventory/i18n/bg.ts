/** Bulgarian text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Свали предмета, преди да го надградиш',
  'item.jewelNotAJewel': 'Този предмет не може да се използва върху друг предмет',
  'item.jewelNotUpgradable': 'Този предмет не може да се подобрява',
  'item.jewelBlessLimit': 'Jewel of Bless стига само до +6',
  'item.jewelSoulLimit': 'Jewel of Soul стига само до +9',
  'item.jewelHarmonyAncient':
    'Jewel of Harmony не се слага на ancient предмети',
  'item.jewelHarmonySocket':
    'Jewel of Harmony не се слага на предмети със socket',
  'item.refineStoneSocket':
    'Камъните за рафиниране не се слагат на предмети със socket',
  'item.jewelWrongTarget':
    'Този предмет не може да се използва върху друг предмет',
  'notify.cannotStore': 'Този предмет не може да се съхрани',
  'notify.cannotTrade': 'Този предмет не може да се търгува',
  'notify.noInventoryRoom': 'В раницата няма място',
  'notify.noRoomForItem': 'Няма място за този предмет',
  'notify.inventorySorted': 'Инвентарът е подреден',
  'notify.itemsMoved': 'Преместени предмета: {count}',
  'notify.itemsBought': 'Купени {count}',
  'notify.cannotMoveItem': 'Не можеш да преместиш този предмет там',
  'notify.cannotUseItem': 'Този предмет не се използва така',
} satisfies Partial<Record<keyof typeof en, string>>;
