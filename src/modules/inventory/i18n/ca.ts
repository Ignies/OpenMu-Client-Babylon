/** ca text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Treu-te l\'objecte abans de millorar-lo',
  'item.jewelNotAJewel': 'Aquest objecte no es pot fer servir sobre un altre objecte',
  'item.jewelNotUpgradable': 'Aquest objecte no es pot millorar',
  'item.jewelBlessLimit': 'La Jewel of Bless només funciona fins a +6',
  'item.jewelSoulLimit': 'La Jewel of Soul només funciona fins a +9',
  'item.jewelHarmonyAncient': 'La Jewel of Harmony no es pot aplicar a objectes Ancient',
  'item.jewelHarmonySocket': 'La Jewel of Harmony no es pot aplicar a objectes amb Socket',
  'item.refineStoneSocket': 'Les pedres de refinament no es poden aplicar a objectes amb Socket',
  'item.jewelWrongTarget': 'Aquest objecte no es pot fer servir sobre un altre objecte',
  'notify.noInventoryRoom': 'No hi ha espai a l\'inventari',
  'notify.noRoomForItem': 'No hi ha espai per a aquest objecte',
  'notify.inventorySorted': 'Inventari ordenat',
  'notify.itemsMoved': '{count} objectes moguts',
  'notify.itemsBought': 'Unitats comprades: {count}',
  'notify.cannotMoveItem': 'No pots moure aquest objecte aquí',
  'notify.cannotUseItem': 'Aquest objecte no es pot fer servir així',
  'notify.cannotStore': 'Aquest objecte no es pot guardar',
  'notify.cannotTrade': 'Aquest objecte no es pot intercanviar',
} satisfies Partial<Record<keyof typeof en, string>>;
