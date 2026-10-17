/** el text of `versions/shared/ui/windows/chat_room`. */

import type en from './en';

export default {
  'chatRoom.title': 'Δωμάτιο συνομιλίας',
  'chatRoom.connecting': 'Σύνδεση με τον διακομιστή συνομιλίας...',
  'chatRoom.closed': 'Αποσυνδέθηκε',
  'chatRoom.members': 'Μέλη ({count})',
  'chatRoom.invite': 'Πρόσκληση',
  'chatRoom.inviteEmpty': 'Κανένας άλλος φίλος δεν είναι σε σύνδεση.',
  'chatRoom.inputPlaceholder': 'Γράψτε ένα μήνυμα',
  'chatRoom.waiting': 'Αναμονή για να μπει ο παίκτης {name}...',
} satisfies Partial<Record<keyof typeof en, string>>;
