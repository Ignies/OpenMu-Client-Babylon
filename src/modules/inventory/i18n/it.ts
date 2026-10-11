/** Italian text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Togli l’oggetto prima di potenziarlo',
  'item.jewelNotAJewel': 'Quell’oggetto non si può usare su un altro oggetto',
  'item.jewelNotUpgradable': "Quell'oggetto non si può potenziare",
  'item.jewelBlessLimit': 'Jewel of Bless arriva solo fino a +6',
  'item.jewelSoulLimit': 'Jewel of Soul arriva solo fino a +9',
  'item.jewelHarmonyAncient':
    'Jewel of Harmony non si applica agli oggetti ancient',
  'item.jewelHarmonySocket':
    'Jewel of Harmony non si applica agli oggetti con socket',
  'item.refineStoneSocket':
    'Le pietre di raffinazione non si applicano agli oggetti con socket',
  'item.jewelWrongTarget':
    "Quell'oggetto non si può usare su un altro oggetto",
  'notify.cannotStore': 'Questo oggetto non si può depositare',
  'notify.cannotTrade': 'Questo oggetto non si può scambiare',
  'notify.noInventoryRoom': 'Non c’è spazio nell’inventario',
  'notify.noRoomForItem': 'Non c’è spazio per quell’oggetto',
  'notify.inventorySorted': 'Inventario ordinato',
  'notify.itemsMoved': '{count} oggetti spostati',
  'notify.itemsBought': 'Unità acquistate: {count}',
  'notify.cannotMoveItem': 'Non puoi spostare quell’oggetto lì',
  'notify.cannotUseItem': 'Quell’oggetto non si usa così',
} satisfies Partial<Record<keyof typeof en, string>>;
