/** tr text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Yükseltmeden önce eşyayı çıkar',
  'item.jewelNotAJewel': 'Bu eşya başka bir eşyaya uygulanamaz',
  'item.jewelNotUpgradable': 'Bu eşya yükseltilemez',
  'item.jewelBlessLimit': 'Jewel of Bless yalnızca +6 seviyesine kadar işe yarar',
  'item.jewelSoulLimit': 'Jewel of Soul yalnızca +9 seviyesine kadar işe yarar',
  'item.jewelHarmonyAncient': 'Jewel of Harmony, Ancient eşyalara uygulanamaz',
  'item.jewelHarmonySocket': 'Jewel of Harmony, Socket eşyalara uygulanamaz',
  'item.refineStoneSocket': 'Arıtma taşları Socket eşyalara uygulanamaz',
  'item.jewelWrongTarget': 'Bu eşya başka bir eşyaya uygulanamaz',
  'notify.noInventoryRoom': 'Envanterde yer yok',
  'notify.noRoomForItem': 'Bu eşya için yer yok',
  'notify.inventorySorted': 'Envanter düzenlendi',
  'notify.itemsMoved': '{count} eşya taşındı',
  'notify.itemsBought': '{count} adet satın alındı',
  'notify.cannotMoveItem': 'Bu eşya oraya taşınamaz',
  'notify.cannotUseItem': 'Bu eşya bu şekilde kullanılamaz',
} satisfies Partial<Record<keyof typeof en, string>>;
