/** hu text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Fejlesztés előtt vedd le a tárgyat',
  'item.jewelNotAJewel': 'Ez a tárgy nem használható másik tárgyon',
  'item.jewelNotUpgradable': 'Ez a tárgy nem fejleszthető',
  'item.jewelBlessLimit': 'A Jewel of Bless csak +6 szintig működik',
  'item.jewelSoulLimit': 'A Jewel of Soul csak +9 szintig működik',
  'item.jewelHarmonyAncient': 'A Jewel of Harmony nem használható Ancient tárgyon',
  'item.jewelHarmonySocket': 'A Jewel of Harmony nem használható Socket tárgyon',
  'item.refineStoneSocket': 'Finomítókő nem használható Socket tárgyon',
  'item.jewelWrongTarget': 'Ez a tárgy nem használható másik tárgyon',
  'notify.noInventoryRoom': 'Nincs hely a leltárban',
  'notify.noRoomForItem': 'Nincs hely ennek a tárgynak',
  'notify.inventorySorted': 'Leltár rendezve',
  'notify.itemsMoved': '{count} tárgy áthelyezve',
  'notify.itemsBought': '{count} darab megvéve',
  'notify.cannotMoveItem': 'Ez a tárgy nem tehető oda',
  'notify.cannotUseItem': 'Ez a tárgy így nem használható',
} satisfies Partial<Record<keyof typeof en, string>>;
