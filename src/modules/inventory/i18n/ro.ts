/** Romanian text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Scoate obiectul înainte să îl îmbunătățești',
  'item.jewelNotAJewel': 'Obiectul acela nu poate fi folosit pe alt obiect',
  'item.jewelNotUpgradable': 'Acel obiect nu poate fi îmbunătățit',
  'item.jewelBlessLimit': 'Jewel of Bless merge doar până la +6',
  'item.jewelSoulLimit': 'Jewel of Soul merge doar până la +9',
  'item.jewelHarmonyAncient':
    'Jewel of Harmony nu se poate pune pe obiecte ancient',
  'item.jewelHarmonySocket':
    'Jewel of Harmony nu se poate pune pe obiecte cu socket',
  'item.refineStoneSocket':
    'Pietrele de rafinare nu se pot pune pe obiecte cu socket',
  'item.jewelWrongTarget': 'Acel obiect nu poate fi folosit pe alt obiect',
  'notify.cannotStore': 'Acest obiect nu poate fi depozitat',
  'notify.cannotTrade': 'Acest obiect nu poate fi schimbat',
  'notify.noInventoryRoom': 'Nu este loc în inventar',
  'notify.noRoomForItem': 'Nu este loc pentru acel obiect',
  'notify.inventorySorted': 'Inventar aranjat',
  'notify.itemsMoved': '{count} obiecte mutate',
  'notify.itemsBought': 'Bucăți cumpărate: {count}',
  'notify.cannotMoveItem': 'Nu poți muta acel obiect acolo',
  'notify.cannotUseItem': 'Acel obiect nu se folosește așa',
} satisfies Partial<Record<keyof typeof en, string>>;
