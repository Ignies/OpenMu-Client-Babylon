/** el text of `versions/shared/ui/windows/party`. */

import type en from './en';

export default {
  'party.title': 'Ομάδα',
  'party.leader': 'Αρχηγός ομάδας',
  'party.leave': 'Αποχώρηση από την ομάδα',
  'party.kick': 'Αποβολή: {name}',
  'party.nearby': 'Παίκτες κοντά',
  'party.nearbyEmpty': 'Σταθείτε δίπλα σε έναν παίκτη για να τον προσκαλέσετε.',
  'party.tradeWith': 'Ανταλλαγή: {name}',
  'party.notInParty': 'Δεν είστε σε ομάδα.',
  'party.invite': 'Πρόσκληση',
  'party.shop': 'Κατάστημα',
} satisfies Partial<Record<keyof typeof en, string>>;
