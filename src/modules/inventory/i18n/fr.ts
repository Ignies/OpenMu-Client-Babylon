/** French text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Retire l’objet avant de l’améliorer',
  'item.jewelNotAJewel': 'Cet objet ne peut pas être utilisé sur un autre objet',
  'item.jewelNotUpgradable': 'Cet objet ne peut pas être amélioré',
  'item.jewelBlessLimit': 'Jewel of Bless ne va que jusqu’à +6',
  'item.jewelSoulLimit': 'Jewel of Soul ne va que jusqu’à +9',
  'item.jewelHarmonyAncient':
    'Jewel of Harmony ne s’applique pas aux objets ancient',
  'item.jewelHarmonySocket':
    'Jewel of Harmony ne s’applique pas aux objets à socket',
  'item.refineStoneSocket':
    'Les pierres de raffinage ne s’appliquent pas aux objets à socket',
  'item.jewelWrongTarget':
    'Cet objet ne peut pas être utilisé sur un autre objet',
  'notify.cannotStore': 'Cet objet ne peut pas être stocké',
  'notify.cannotTrade': 'Cet objet ne peut pas être échangé',
  'notify.noInventoryRoom': 'Pas de place dans l’inventaire',
  'notify.noRoomForItem': 'Pas de place pour cet objet',
  'notify.inventorySorted': 'Inventaire rangé',
  'notify.itemsMoved': '{count} objets déplacés',
  'notify.itemsBought': 'Unités achetées : {count}',
  'notify.cannotMoveItem': 'Impossible de déplacer cet objet là',
  'notify.cannotUseItem': 'Cet objet ne s’utilise pas comme ça',
} satisfies Partial<Record<keyof typeof en, string>>;
