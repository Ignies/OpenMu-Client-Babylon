/** ur text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'اپ گریڈ سے پہلے آئٹم اتاریں',
  'item.jewelNotAJewel': 'یہ آئٹم کسی دوسرے آئٹم پر استعمال نہیں ہو سکتا',
  'item.jewelNotUpgradable': 'یہ آئٹم اپ گریڈ نہیں ہو سکتا',
  'item.jewelBlessLimit': 'Jewel of Bless صرف +6 تک کام کرتا ہے',
  'item.jewelSoulLimit': 'Jewel of Soul صرف +9 تک کام کرتا ہے',
  'item.jewelHarmonyAncient': 'Jewel of Harmony کو Ancient آئٹمز پر نہیں لگایا جا سکتا',
  'item.jewelHarmonySocket': 'Jewel of Harmony کو Socket آئٹمز پر نہیں لگایا جا سکتا',
  'item.refineStoneSocket': 'صفائی کے پتھر Socket آئٹمز پر نہیں لگ سکتے',
  'item.jewelWrongTarget': 'یہ آئٹم کسی دوسرے آئٹم پر استعمال نہیں ہو سکتا',
  'notify.cannotStore': 'یہ آئٹم رکھا نہیں جا سکتا',
  'notify.cannotTrade': 'اس آئٹم کی تجارت نہیں ہو سکتی',
  'notify.noInventoryRoom': 'سامان میں جگہ نہیں',
  'notify.noRoomForItem': 'اس آئٹم کے لیے جگہ نہیں',
  'notify.inventorySorted': 'سامان ترتیب دے دیا گیا',
  'notify.itemsMoved': '{count} آئٹم منتقل کیے گئے',
  'notify.itemsBought': '{count} عدد خریدے گئے',
  'notify.cannotMoveItem': 'یہ آئٹم وہاں نہیں جا سکتا',
  'notify.cannotUseItem': 'یہ آئٹم اس طرح استعمال نہیں ہو سکتا',
} satisfies Partial<Record<keyof typeof en, string>>;
