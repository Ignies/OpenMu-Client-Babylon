/** el text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Δεν μπορείτε να προσθέσετε τον εαυτό σας στους φίλους.',
  'friends.alreadyOnList': 'Ο παίκτης {name} είναι ήδη στη λίστα φίλων σας.',
  'friends.listFull': 'Η λίστα φίλων σας είναι γεμάτη.',
  'friends.requestSent': 'Το αίτημα φιλίας στάλθηκε στον παίκτη {name}.',
  'friends.requestFailed': 'Δεν ήταν δυνατή η αποστολή του αιτήματος φιλίας.',
  'friends.added': 'Ο παίκτης {name} προστέθηκε στη λίστα φίλων σας.',
  'friends.cannotLetterSelf': 'Δεν μπορείτε να στείλετε γράμμα στον εαυτό σας.',
  'friends.letterArrived': 'Ήρθε γράμμα από τον παίκτη {name}.',
  'friends.letterDeleteFailed': 'Δεν ήταν δυνατή η διαγραφή του γράμματος.',
  'friends.letterSent': 'Το γράμμα στάλθηκε.',
  'friends.letterTryAgain': 'Δεν ήταν δυνατή η αποστολή του γράμματος. Δοκιμάστε ξανά.',
  'friends.mailboxFull': 'Αυτό το γραμματοκιβώτιο είναι γεμάτο.',
  'friends.noSuchCharacter': 'Δεν υπάρχει χαρακτήρας με αυτό το όνομα.',
  'friends.letterNeedsZen': 'Δεν έχετε αρκετά Zen για να στείλετε γράμμα.',
  'friends.letterFailed': 'Δεν ήταν δυνατή η αποστολή του γράμματος.',
} satisfies Partial<Record<keyof typeof en, string>>;
