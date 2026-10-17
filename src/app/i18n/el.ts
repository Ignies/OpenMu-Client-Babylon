/** el text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'Σφάλμα σύνδεσης WebSocket',
  'notify.connectionLost': 'Η σύνδεση με τον διακομιστή χάθηκε',
  'notify.serverListLost': 'Η σύνδεση με τη λίστα διακομιστών χάθηκε',
  'notify.helperStarted': 'Το MU Helper ξεκίνησε',
  'notify.helperStopped': 'Το MU Helper σταμάτησε',
  'notify.helperSafeZone': 'Το MU Helper δεν ξεκινά σε ασφαλή ζώνη',
  'notify.helperCost': 'Το MU Helper κατανάλωσε {total} Zen',
  'notify.zenCap': 'Δεν μπορείτε να κουβαλάτε περισσότερα από 2.000.000.000 Zen',
  'notify.cannotSell': 'Αυτό το αντικείμενο δεν πωλείται',
  'notify.merchantRefuses': 'Ο έμπορος δεν θέλει αυτό το αντικείμενο',
  'notify.learnedSkill': 'Μάθατε τη δεξιότητα {name}',
  'notify.storageOpen': 'Δεν μπορείτε να χρησιμοποιήσετε αντικείμενα όσο η αποθήκη είναι ανοιχτή',
  'notify.upgradeNeedsServer': 'Η αναβάθμιση χρειάζεται διακομιστή',
  'notify.noAnswerRestored': 'Ο διακομιστής δεν απάντησε – το αντικείμενο επανήλθε',
  'notify.cannotBuy': 'Δεν μπορείτε να αγοράσετε αυτό το αντικείμενο',
} satisfies Partial<Record<keyof typeof en, string>>;
