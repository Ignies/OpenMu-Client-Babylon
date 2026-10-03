/** Spanish text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Quítate el objeto antes de mejorarlo',
  'item.jewelNotAJewel': 'Ese objeto no se puede usar sobre otro objeto',
  'item.jewelNotUpgradable': 'Ese objeto no se puede mejorar',
  'item.jewelBlessLimit': 'Jewel of Bless solo llega hasta +6',
  'item.jewelSoulLimit': 'Jewel of Soul solo llega hasta +9',
  'item.jewelHarmonyAncient':
    'Jewel of Harmony no se puede usar en objetos ancient',
  'item.jewelHarmonySocket':
    'Jewel of Harmony no se puede usar en objetos con socket',
  'item.refineStoneSocket':
    'Las piedras de refinado no se pueden usar en objetos con socket',
  'item.jewelWrongTarget': 'Ese objeto no se puede usar sobre otro objeto',
  'notify.cannotStore': 'Este objeto no se puede guardar',
  'notify.cannotTrade': 'Este objeto no se puede comerciar',
  'notify.noInventoryRoom': 'No hay sitio en el inventario',
  'notify.noRoomForItem': 'No hay sitio para ese objeto',
  'notify.inventorySorted': 'Inventario ordenado',
  'notify.itemsMoved': '{count} objetos movidos',
  'notify.itemsBought': 'Unidades compradas: {count}',
  'notify.cannotMoveItem': 'No puedes mover ese objeto ahí',
  'notify.cannotUseItem': 'Ese objeto no se usa así',
} satisfies Partial<Record<keyof typeof en, string>>;
