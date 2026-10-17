/** bn text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'উন্নীত করার আগে আইটেমটি খুলে ফেলুন',
  'item.jewelNotAJewel': 'এই আইটেম অন্য আইটেমে ব্যবহার করা যায় না',
  'item.jewelNotUpgradable': 'ওই আইটেম উন্নীত করা যায় না',
  'item.jewelBlessLimit': 'Jewel of Bless শুধু +6 পর্যন্ত কাজ করে',
  'item.jewelSoulLimit': 'Jewel of Soul শুধু +9 পর্যন্ত কাজ করে',
  'item.jewelHarmonyAncient': 'Ancient আইটেমে Jewel of Harmony প্রয়োগ করা যায় না',
  'item.jewelHarmonySocket': 'Socket আইটেমে Jewel of Harmony প্রয়োগ করা যায় না',
  'item.refineStoneSocket': 'Socket আইটেমে পরিশোধন পাথর প্রয়োগ করা যায় না',
  'item.jewelWrongTarget': 'এই আইটেম অন্য আইটেমে ব্যবহার করা যায় না',
  'notify.noInventoryRoom': 'ইনভেন্টরিতে জায়গা নেই',
  'notify.noRoomForItem': 'ওই আইটেমের জন্য জায়গা নেই',
  'notify.inventorySorted': 'ইনভেন্টরি সাজানো হয়েছে',
  'notify.itemsMoved': '{count} আইটেম সরানো হয়েছে',
  'notify.itemsBought': 'কেনা হয়েছে: {count}',
  'notify.cannotMoveItem': 'ওই আইটেম সেখানে সরানো যায় না',
  'notify.cannotUseItem': 'ওই আইটেম এভাবে ব্যবহার করা যায় না',
} satisfies Partial<Record<keyof typeof en, string>>;
