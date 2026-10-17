/** fil text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Tanggalin muna ang item bago ito i-upgrade',
  'item.jewelNotAJewel': 'Hindi magagamit ang item na iyan sa ibang item',
  'item.jewelNotUpgradable': 'Hindi maa-upgrade ang item na iyan',
  'item.jewelBlessLimit': 'Hanggang +6 lamang gumagana ang Jewel of Bless',
  'item.jewelSoulLimit': 'Hanggang +9 lamang gumagana ang Jewel of Soul',
  'item.jewelHarmonyAncient': 'Hindi magagamit ang Jewel of Harmony sa mga Ancient item',
  'item.jewelHarmonySocket': 'Hindi magagamit ang Jewel of Harmony sa mga Socket item',
  'item.refineStoneSocket': 'Hindi magagamit ang mga batong pandalisay sa mga Socket item',
  'item.jewelWrongTarget': 'Hindi magagamit ang item na iyan sa ibang item',
  'notify.cannotStore': 'Hindi maitatabi ang item na ito',
  'notify.cannotTrade': 'Hindi maipagpapalit ang item na ito',
  'notify.noInventoryRoom': 'Walang espasyo sa imbentaryo',
  'notify.noRoomForItem': 'Walang espasyo para sa item na iyan',
  'notify.inventorySorted': 'Naayos ang imbentaryo',
  'notify.itemsMoved': '{count} item ang nailipat',
  'notify.itemsBought': '{count} ang nabili',
  'notify.cannotMoveItem': 'Hindi mailipat doon ang item na iyan',
  'notify.cannotUseItem': 'Hindi magagamit nang ganyan ang item na iyan',
} satisfies Partial<Record<keyof typeof en, string>>;
