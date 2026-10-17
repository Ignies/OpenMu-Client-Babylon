/** el text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'Λήψη δεδομένων παιχνιδιού',
  'autoDownload.done': 'Τα δεδομένα του παιχνιδιού λήφθηκαν',
  'autoDownload.cancel': 'Ακύρωση',
  'autoDownload.hide': 'Απόκρυψη (η λήψη συνεχίζεται)',
  'autoDownload.phase.map': 'Φόρτωση χάρτη: {name}',
  'autoDownload.phase.icons': 'Φόρτωση αντικειμένων',
  'autoDownload.phase.audio': 'Φόρτωση μουσικής και ήχων',
  'autoDownload.phase.monsters': 'Φόρτωση χαρακτήρων και πλασμάτων',
  'autoDownload.phase.core': 'Φόρτωση διεπαφής και εφέ',
  'autoDownload.left': 'Απομένουν {left} MB',
  'autoDownload.received': 'Λήφθηκαν {got} MB από {total} MB',
  'autoDownload.screenTitle': 'Προετοιμασία της περιπέτειάς σας',
  'autoDownload.screenText': 'Αυτά τα αρχεία διατηρούνται ώστε το επόμενο παιχνίδι να φορτώνει πιο γρήγορα. Μόνο την πρώτη φορά.',
  'autoDownload.skip': 'Είσοδος παρ\' όλα αυτά',
  'autoDownload.skipNote': 'Η λήψη συνεχίζεται στο παρασκήνιο. Αν κλείσετε το παιχνίδι, συνεχίζει από εκεί που σταμάτησε.',
} satisfies Partial<Record<keyof typeof en, string>>;
