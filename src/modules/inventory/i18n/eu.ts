/** eu text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Erantzi objektua hobetu aurretik',
  'item.jewelNotAJewel': 'Objektu hori ezin da beste objektu baten gainean erabili',
  'item.jewelNotUpgradable': 'Objektu hori ezin da hobetu',
  'item.jewelBlessLimit': 'Jewel of Bless +6 arte bakarrik erabil daiteke',
  'item.jewelSoulLimit': 'Jewel of Soul +9 arte bakarrik erabil daiteke',
  'item.jewelHarmonyAncient': 'Jewel of Harmony ezin da Ancient objektuetan erabili',
  'item.jewelHarmonySocket': 'Jewel of Harmony ezin da Socket objektuetan erabili',
  'item.refineStoneSocket': 'Fintze-harriak ezin dira Socket objektuetan erabili',
  'item.jewelWrongTarget': 'Objektu hori ezin da beste objektu baten gainean erabili',
  'notify.noInventoryRoom': 'Ez dago lekurik inbentarioan',
  'notify.noRoomForItem': 'Ez dago lekurik objektu horrentzat',
  'notify.inventorySorted': 'Inbentarioa antolatu da',
  'notify.itemsMoved': '{count} objektu mugitu dira',
  'notify.itemsBought': '{count} unitate erosi dira',
  'notify.cannotMoveItem': 'Ezin da objektu hori hara mugitu',
  'notify.cannotUseItem': 'Objektu hori ezin da horrela erabili',
} satisfies Partial<Record<keyof typeof en, string>>;
