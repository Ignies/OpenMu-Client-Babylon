/** el text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'Κιθάρα',
  'instrument.flute': 'Φλάουτο',
  'instrument.ocarina': 'Οκαρίνα',
  'instrument.harp': 'Άρπα',
  'instrument.drums': 'Τύμπανα',
  'instrument.you': 'εσείς',
  'instrument.startsPlaying': 'Ο παίκτης {name} αρχίζει να παίζει: {instrument}',
  'instrument.stopsPlaying': 'Ο παίκτης {name} σταματά να παίζει',
  'instrument.joinsBand': 'Ο παίκτης {name} μπαίνει στην μπάντα (αρχηγός: {master})',
  'instrument.leavesBand': 'Ο παίκτης {name} φεύγει από την μπάντα',
  'instrument.fileError':
    'Αυτό το αρχείο δεν είναι αρχείο MIDI που μπορεί να παίξει αυτός ο client',
  'instrument.unavailable': 'Τα όργανα δεν είναι διαθέσιμα σε αυτόν τον διακομιστή',
  'instrument.stopped.flood': 'Η εκτέλεσή σας διακόπηκε: πάρα πολλές νότες μαζί',
  'instrument.stopped.order': 'Η εκτέλεσή σας διακόπηκε: οι νότες έφτασαν εκτός σειράς',
  'instrument.stopped.gone': 'Ο μουσικός έφυγε',
  'instrument.refused.cooldown': 'Μπορείτε να παίξετε ξανά σε {seconds} δευτ.',
  'instrument.refused.busy': 'Ήδη παίζετε ή είστε σε μπάντα',
  'instrument.refused.full': 'Υπάρχουν πάρα πολλοί μουσικοί εδώ αυτή τη στιγμή',
  'instrument.refused.range': 'Πολύ μακριά από τον μουσικό',
  'instrument.refused.map': 'Ο μουσικός είναι σε άλλο χάρτη',
  'instrument.refused.notPerforming': 'Αυτός ο παίκτης δεν παίζει',
  'instrument.refused.rate': 'Πιο αργά',
} satisfies Partial<Record<keyof typeof en, string>>;
