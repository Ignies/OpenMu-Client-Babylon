/** hi text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'अपग्रेड करने से पहले आइटम उतारें',
  'item.jewelNotAJewel': 'वह आइटम किसी दूसरे आइटम पर इस्तेमाल नहीं किया जा सकता',
  'item.jewelNotUpgradable': 'वह आइटम अपग्रेड नहीं किया जा सकता',
  'item.jewelBlessLimit': 'Jewel of Bless सिर्फ़ +6 तक काम करता है',
  'item.jewelSoulLimit': 'Jewel of Soul सिर्फ़ +9 तक काम करता है',
  'item.jewelHarmonyAncient': 'Jewel of Harmony, Ancient आइटम पर नहीं लगाया जा सकता',
  'item.jewelHarmonySocket': 'Jewel of Harmony, Socket आइटम पर नहीं लगाया जा सकता',
  'item.refineStoneSocket': 'शोधन पत्थर Socket आइटम पर नहीं लगाए जा सकते',
  'item.jewelWrongTarget': 'वह आइटम किसी दूसरे आइटम पर इस्तेमाल नहीं किया जा सकता',
  'notify.noInventoryRoom': 'इन्वेंटरी में जगह नहीं है',
  'notify.noRoomForItem': 'उस आइटम के लिए जगह नहीं है',
  'notify.inventorySorted': 'इन्वेंटरी सजा दी गई',
  'notify.itemsMoved': '{count} आइटम ले जाए गए',
  'notify.itemsBought': '{count} खरीदे गए',
  'notify.cannotMoveItem': 'वह आइटम वहां नहीं ले जाया जा सकता',
  'notify.cannotUseItem': 'वह आइटम इस तरह इस्तेमाल नहीं किया जा सकता',
  'notify.cannotStore': 'यह आइटम रखा नहीं जा सकता',
  'notify.cannotTrade': 'इस आइटम का लेन-देन नहीं किया जा सकता',
} satisfies Partial<Record<keyof typeof en, string>>;
