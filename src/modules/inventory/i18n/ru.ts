/** Russian text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Снимите предмет, прежде чем улучшать его',
  'item.jewelNotAJewel': 'Этот предмет нельзя применить к другому предмету',
  'item.jewelNotUpgradable': 'Этот предмет нельзя улучшить',
  'item.jewelBlessLimit': 'Jewel of Bless работает только до +6',
  'item.jewelSoulLimit': 'Jewel of Soul работает только до +9',
  'item.jewelHarmonyAncient':
    'Jewel of Harmony не применяется к ancient-предметам',
  'item.jewelHarmonySocket':
    'Jewel of Harmony не применяется к предметам с сокетами',
  'item.refineStoneSocket':
    'Камни очистки не применяются к предметам с сокетами',
  'item.jewelWrongTarget': 'Этот предмет нельзя применить к другому предмету',
  'notify.cannotStore': 'Этот предмет нельзя положить на хранение',
  'notify.cannotTrade': 'Этот предмет нельзя обменять',
  'notify.noInventoryRoom': 'В инвентаре нет места',
  'notify.noRoomForItem': 'Для этого предмета нет места',
  'notify.inventorySorted': 'Инвентарь упорядочен',
  'notify.itemsMoved': 'Перемещено предметов: {count}',
  'notify.itemsBought': 'Куплено: {count}',
  'notify.cannotMoveItem': 'Туда этот предмет переместить нельзя',
  'notify.cannotUseItem': 'Так этот предмет не используют',
} satisfies Partial<Record<keyof typeof en, string>>;
