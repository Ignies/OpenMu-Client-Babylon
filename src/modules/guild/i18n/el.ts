/** el text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': 'Ο παίκτης {name} έφυγε από τη συντεχνία.',
  'guild.youLeft': 'Φύγατε από τη συντεχνία.',
  'guild.disbanded': 'Η συντεχνία διαλύθηκε.',
  'guild.memberRemoved': 'Το μέλος αποβλήθηκε από τη συντεχνία.',
  'guild.onlyMasterRemoves': 'Μόνο ο αρχηγός της συντεχνίας μπορεί να αποβάλλει μέλη.',
  'guild.wrongPassword': 'Ο κωδικός που εισαγάγατε είναι λάθος.',
  'guild.created': 'Η συντεχνία δημιουργήθηκε.',
  'guild.nameTaken': 'Αυτό το όνομα συντεχνίας χρησιμοποιείται ήδη.',
  'guild.createFailed': 'Δεν ήταν δυνατή η δημιουργία της συντεχνίας.',
  'guild.joinRefused': 'Ο αρχηγός της συντεχνίας απέρριψε το αίτημά σας.',
  'guild.joined': 'Μπήκατε στη συντεχνία.',
  'guild.isFull': 'Η συντεχνία είναι γεμάτη.',
  'guild.masterUnavailable': 'Ο αρχηγός της συντεχνίας δεν είναι διαθέσιμος.',
  'guild.masterBusy': 'Ο αρχηγός της συντεχνίας είναι απασχολημένος. Δοκιμάστε αργότερα.',
  'guild.needLevel6': 'Πρέπει να είστε τουλάχιστον επίπεδο 6 για να μπείτε σε συντεχνία.',
} satisfies Partial<Record<keyof typeof en, string>>;
