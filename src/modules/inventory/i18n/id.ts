/** id text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Lepas item sebelum meningkatkannya',
  'item.jewelNotAJewel': 'Item itu tidak dapat dipakai pada item lain',
  'item.jewelNotUpgradable': 'Item itu tidak dapat ditingkatkan',
  'item.jewelBlessLimit': 'Jewel of Bless hanya berfungsi hingga +6',
  'item.jewelSoulLimit': 'Jewel of Soul hanya berfungsi hingga +9',
  'item.jewelHarmonyAncient': 'Jewel of Harmony tidak dapat dipakai pada item Ancient',
  'item.jewelHarmonySocket': 'Jewel of Harmony tidak dapat dipakai pada item Socket',
  'item.refineStoneSocket': 'Batu pemurnian tidak dapat dipakai pada item Socket',
  'item.jewelWrongTarget': 'Item itu tidak dapat dipakai pada item lain',
  'notify.noInventoryRoom': 'Tidak ada ruang di inventaris',
  'notify.noRoomForItem': 'Tidak ada ruang untuk item itu',
  'notify.inventorySorted': 'Inventaris dirapikan',
  'notify.itemsMoved': '{count} item dipindahkan',
  'notify.itemsBought': '{count} dibeli',
  'notify.cannotMoveItem': 'Item itu tidak dapat dipindahkan ke sana',
  'notify.cannotUseItem': 'Item itu tidak dapat dipakai seperti itu',
  'notify.cannotStore': 'Item ini tidak dapat disimpan',
  'notify.cannotTrade': 'Item ini tidak dapat ditukar',
} satisfies Partial<Record<keyof typeof en, string>>;
