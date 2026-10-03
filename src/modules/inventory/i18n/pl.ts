/** Polish text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Zdejmij przedmiot przed ulepszeniem',
  'item.jewelNotAJewel': 'Tego przedmiotu nie można użyć na innym przedmiocie',
  'item.jewelNotUpgradable': 'Tego przedmiotu nie można ulepszyć',
  'item.jewelBlessLimit': 'Jewel of Bless działa tylko do +6',
  'item.jewelSoulLimit': 'Jewel of Soul działa tylko do +9',
  'item.jewelHarmonyAncient': 'Jewel of Harmony nie działa na przedmioty Ancient',
  'item.jewelHarmonySocket': 'Jewel of Harmony nie działa na przedmioty Socket',
  'item.refineStoneSocket': 'Kamienie rafinacji nie działają na przedmioty Socket',
  'item.jewelWrongTarget': 'Tego przedmiotu nie można użyć na innym przedmiocie',
  'notify.cannotStore': 'Tego przedmiotu nie można przechować',
  'notify.cannotTrade': 'Tego przedmiotu nie można wymienić',
  'notify.noInventoryRoom': 'Brak miejsca w ekwipunku',
  'notify.noRoomForItem': 'Brak miejsca na ten przedmiot',
  'notify.inventorySorted': 'Ekwipunek uporządkowany',
  'notify.itemsMoved': 'Przeniesione przedmioty: {count}',
  'notify.itemsBought': 'Kupiono: {count}',
  'notify.cannotMoveItem': 'Nie można tam przenieść tego przedmiotu',
  'notify.cannotUseItem': 'Tego przedmiotu nie można tak użyć',
} satisfies Partial<Record<keyof typeof en, string>>;
