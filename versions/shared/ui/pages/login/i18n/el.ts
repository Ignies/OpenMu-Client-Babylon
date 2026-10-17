/** el text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'Εισαγάγετε όνομα λογαριασμού και κωδικό',
  'login.createAccount': 'Δημιουργία λογαριασμού',
  'login.rememberMe': 'Να με θυμάσαι;',
  'register.id': 'ID',
  'register.password': 'Κωδικός',
  'register.confirm': 'Επιβεβαίωση',
  'register.fillEveryField': 'Συμπληρώστε όλα τα πεδία.',
  'register.idTooShort': 'Το ID πρέπει να έχει τουλάχιστον {min} χαρακτήρες.',
  'register.idChars': 'Το ID μπορεί να περιέχει μόνο γράμματα και αριθμούς.',
  'register.passwordTooShort': 'Ο κωδικός πρέπει να έχει τουλάχιστον {min} χαρακτήρες.',
  'register.passwordChars':
    'Ο κωδικός μπορεί να περιέχει μόνο γράμματα, αριθμούς και βασικά σύμβολα.',
  'register.mismatch': 'Οι κωδικοί δεν ταιριάζουν.',
  'register.unreachable': 'Δεν ήταν δυνατή η επικοινωνία με τον διακομιστή.',
  'register.failed': 'Η εγγραφή απέτυχε ({status}).',
  'register.created': 'Ο λογαριασμός δημιουργήθηκε. Μπορείτε να συνδεθείτε τώρα.',
} satisfies Partial<Record<keyof typeof en, string>>;
