/** Portuguese text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Tire o item antes de melhorá-lo',
  'item.jewelNotAJewel': 'Esse item não pode ser usado sobre outro item',
  'item.jewelNotUpgradable': 'Esse item não pode ser melhorado',
  'item.jewelBlessLimit': 'Jewel of Bless só funciona até +6',
  'item.jewelSoulLimit': 'Jewel of Soul só funciona até +9',
  'item.jewelHarmonyAncient':
    'Jewel of Harmony não pode ser usada em itens ancient',
  'item.jewelHarmonySocket':
    'Jewel of Harmony não pode ser usada em itens com socket',
  'item.refineStoneSocket':
    'As pedras de refino não podem ser usadas em itens com socket',
  'item.jewelWrongTarget': 'Esse item não pode ser usado sobre outro item',
  'notify.cannotStore': 'Este item não pode ser guardado',
  'notify.cannotTrade': 'Este item não pode ser trocado',
  'notify.noInventoryRoom': 'Não há espaço no inventário',
  'notify.noRoomForItem': 'Não há espaço para esse item',
  'notify.inventorySorted': 'Inventário organizado',
  'notify.itemsMoved': '{count} itens movidos',
  'notify.itemsBought': 'Unidades compradas: {count}',
  'notify.cannotMoveItem': 'Você não pode mover esse item para aí',
  'notify.cannotUseItem': 'Esse item não se usa assim',
} satisfies Partial<Record<keyof typeof en, string>>;
