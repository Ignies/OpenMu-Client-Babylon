/** German text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Lege den Gegenstand ab, bevor du ihn aufwertest',
  'item.jewelNotAJewel': 'Dieser Gegenstand kann nicht auf einen anderen angewendet werden',
  'item.jewelNotUpgradable': 'Dieser Gegenstand lässt sich nicht aufwerten',
  'item.jewelBlessLimit': 'Jewel of Bless wirkt nur bis +6',
  'item.jewelSoulLimit': 'Jewel of Soul wirkt nur bis +9',
  'item.jewelHarmonyAncient':
    'Jewel of Harmony geht nicht auf Ancient-Gegenstände',
  'item.jewelHarmonySocket':
    'Jewel of Harmony geht nicht auf Socket-Gegenstände',
  'item.refineStoneSocket':
    'Verfeinerungssteine gehen nicht auf Socket-Gegenstände',
  'item.jewelWrongTarget':
    'Dieser Gegenstand lässt sich nicht auf einen anderen anwenden',
  'notify.cannotStore': 'Dieser Gegenstand lässt sich nicht einlagern',
  'notify.cannotTrade': 'Dieser Gegenstand lässt sich nicht handeln',
  'notify.noInventoryRoom': 'Kein Platz im Inventar',
  'notify.noRoomForItem': 'Kein Platz für diesen Gegenstand',
  'notify.inventorySorted': 'Inventar geordnet',
  'notify.itemsMoved': '{count} Gegenstände verschoben',
  'notify.itemsBought': '{count} gekauft',
  'notify.cannotMoveItem': 'Dieser Gegenstand kann nicht dorthin',
  'notify.cannotUseItem': 'So lässt sich dieser Gegenstand nicht benutzen',
} satisfies Partial<Record<keyof typeof en, string>>;
