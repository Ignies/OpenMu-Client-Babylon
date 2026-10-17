/** sr-Latn text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Skini predmet pre unapređivanja',
  'item.jewelNotAJewel': 'Taj predmet ne može da se koristi na drugom predmetu',
  'item.jewelNotUpgradable': 'Taj predmet ne može da se unapredi',
  'item.jewelBlessLimit': 'Jewel of Bless deluje samo do +6',
  'item.jewelSoulLimit': 'Jewel of Soul deluje samo do +9',
  'item.jewelHarmonyAncient': 'Jewel of Harmony ne može da se primeni na Ancient predmete',
  'item.jewelHarmonySocket': 'Jewel of Harmony ne može da se primeni na Socket predmete',
  'item.refineStoneSocket': 'Kamenje za rafinisanje ne može da se primeni na Socket predmete',
  'item.jewelWrongTarget': 'Taj predmet ne može da se koristi na drugom predmetu',
  'notify.noInventoryRoom': 'Nema mesta u inventaru',
  'notify.noRoomForItem': 'Nema mesta za taj predmet',
  'notify.inventorySorted': 'Inventar je sređen',
  'notify.itemsMoved': 'Premešteno predmeta: {count}',
  'notify.itemsBought': 'Kupljeno: {count}',
  'notify.cannotMoveItem': 'Taj predmet ne može da se premesti tamo',
  'notify.cannotUseItem': 'Taj predmet ne može tako da se koristi',
  'notify.cannotStore': 'Ovaj predmet ne može da se odloži',
  'notify.cannotTrade': 'Ovaj predmet ne može da se razmeni',
} satisfies Partial<Record<keyof typeof en, string>>;
