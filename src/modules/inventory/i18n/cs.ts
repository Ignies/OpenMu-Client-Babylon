/** cs text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Před vylepšením předmět sundej',
  'item.jewelNotAJewel': 'Tento předmět nelze použít na jiný předmět',
  'item.jewelNotUpgradable': 'Tento předmět nelze vylepšit',
  'item.jewelBlessLimit': 'Jewel of Bless funguje jen do +6',
  'item.jewelSoulLimit': 'Jewel of Soul funguje jen do +9',
  'item.jewelHarmonyAncient': 'Jewel of Harmony nelze použít na předměty Ancient',
  'item.jewelHarmonySocket': 'Jewel of Harmony nelze použít na předměty Socket',
  'item.refineStoneSocket': 'Rafinační kameny nelze použít na předměty Socket',
  'item.jewelWrongTarget': 'Tento předmět nelze použít na jiný předmět',
  'notify.noInventoryRoom': 'V inventáři není místo',
  'notify.noRoomForItem': 'Pro tento předmět není místo',
  'notify.inventorySorted': 'Inventář uspořádán',
  'notify.itemsMoved': 'Přesunuté předměty: {count}',
  'notify.itemsBought': 'Koupeno: {count}',
  'notify.cannotMoveItem': 'Tento předmět tam nelze přesunout',
  'notify.cannotUseItem': 'Tento předmět nelze takto použít',
  'notify.cannotStore': 'Tento předmět nelze uložit',
  'notify.cannotTrade': 'Tímto předmětem nelze obchodovat',
} satisfies Partial<Record<keyof typeof en, string>>;
