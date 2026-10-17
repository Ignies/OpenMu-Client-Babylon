/** el text of `src/modules/inventory`. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Βγάλτε το αντικείμενο πριν το αναβαθμίσετε',
  'item.jewelNotAJewel': 'Αυτό το αντικείμενο δεν χρησιμοποιείται σε άλλο αντικείμενο',
  'item.jewelNotUpgradable': 'Αυτό το αντικείμενο δεν αναβαθμίζεται',
  'item.jewelBlessLimit': 'Το Jewel of Bless λειτουργεί μόνο έως +6',
  'item.jewelSoulLimit': 'Το Jewel of Soul λειτουργεί μόνο έως +9',
  'item.jewelHarmonyAncient': 'Το Jewel of Harmony δεν εφαρμόζεται σε αντικείμενα Ancient',
  'item.jewelHarmonySocket': 'Το Jewel of Harmony δεν εφαρμόζεται σε αντικείμενα Socket',
  'item.refineStoneSocket': 'Οι πέτρες εξευγενισμού δεν εφαρμόζονται σε αντικείμενα Socket',
  'item.jewelWrongTarget': 'Αυτό το αντικείμενο δεν χρησιμοποιείται σε άλλο αντικείμενο',
  'notify.noInventoryRoom': 'Δεν υπάρχει χώρος στο σακίδιο',
  'notify.noRoomForItem': 'Δεν υπάρχει χώρος για αυτό το αντικείμενο',
  'notify.inventorySorted': 'Το σακίδιο τακτοποιήθηκε',
  'notify.itemsMoved': 'Μετακινήθηκαν αντικείμενα: {count}',
  'notify.itemsBought': 'Αγοράστηκαν: {count}',
  'notify.cannotMoveItem': 'Αυτό το αντικείμενο δεν μετακινείται εκεί',
  'notify.cannotUseItem': 'Αυτό το αντικείμενο δεν χρησιμοποιείται έτσι',
} satisfies Partial<Record<keyof typeof en, string>>;
