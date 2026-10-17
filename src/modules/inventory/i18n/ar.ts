/** ar text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'انزع الغرض قبل تطويره',
  'item.jewelNotAJewel': 'لا يمكن استخدام هذا الغرض على غرض آخر',
  'item.jewelNotUpgradable': 'لا يمكن تطوير هذا الغرض',
  'item.jewelBlessLimit': 'لا تعمل Jewel of Bless إلا حتى +6',
  'item.jewelSoulLimit': 'لا تعمل Jewel of Soul إلا حتى +9',
  'item.jewelHarmonyAncient': 'لا يمكن استخدام Jewel of Harmony على أغراض Ancient',
  'item.jewelHarmonySocket': 'لا يمكن استخدام Jewel of Harmony على أغراض Socket',
  'item.refineStoneSocket': 'لا يمكن استخدام أحجار التنقية على أغراض Socket',
  'item.jewelWrongTarget': 'لا يمكن استخدام هذا الغرض على غرض آخر',
  'notify.noInventoryRoom': 'لا توجد مساحة في الحقيبة',
  'notify.noRoomForItem': 'لا توجد مساحة لهذا الغرض',
  'notify.inventorySorted': 'تم ترتيب الحقيبة',
  'notify.itemsMoved': 'الأغراض المنقولة: {count}',
  'notify.itemsBought': 'تم شراء: {count}',
  'notify.cannotMoveItem': 'لا يمكن نقل هذا الغرض إلى هناك',
  'notify.cannotUseItem': 'لا يمكن استخدام هذا الغرض بهذه الطريقة',
} satisfies Partial<Record<keyof typeof en, string>>;
