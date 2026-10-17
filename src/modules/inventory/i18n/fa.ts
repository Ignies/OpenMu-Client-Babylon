/** fa text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'پیش از ارتقا، آیتم را درآورید',
  'item.jewelNotAJewel': 'این آیتم را نمی‌توان روی آیتم دیگری به کار برد',
  'item.jewelNotUpgradable': 'این آیتم قابل ارتقا نیست',
  'item.jewelBlessLimit': 'Jewel of Bless فقط تا +6 کار می‌کند',
  'item.jewelSoulLimit': 'Jewel of Soul فقط تا +9 کار می‌کند',
  'item.jewelHarmonyAncient': 'Jewel of Harmony را نمی‌توان روی آیتم‌های Ancient به کار برد',
  'item.jewelHarmonySocket': 'Jewel of Harmony را نمی‌توان روی آیتم‌های Socket به کار برد',
  'item.refineStoneSocket': 'سنگ پالایش را نمی‌توان روی آیتم‌های Socket به کار برد',
  'item.jewelWrongTarget': 'این آیتم را نمی‌توان روی آیتم دیگری به کار برد',
  'notify.cannotStore': 'این آیتم را نمی‌توان در انبار گذاشت',
  'notify.cannotTrade': 'این آیتم قابل معامله نیست',
  'notify.noInventoryRoom': 'در کوله‌پشتی جا نیست',
  'notify.noRoomForItem': 'برای آن آیتم جا نیست',
  'notify.inventorySorted': 'کوله‌پشتی مرتب شد',
  'notify.itemsMoved': 'تعداد {count} آیتم جابه‌جا شد',
  'notify.itemsBought': 'تعداد {count} عدد خریده شد',
  'notify.cannotMoveItem': 'این آیتم را نمی‌توان آن‌جا گذاشت',
  'notify.cannotUseItem': 'این آیتم را نمی‌توان این‌گونه به کار برد',
} satisfies Partial<Record<keyof typeof en, string>>;
