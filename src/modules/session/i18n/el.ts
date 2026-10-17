/** el text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Κλείστε το παράθυρο του Chaos Machine πριν βγείτε από το παιχνίδι.',
  'exit.noAnswer': 'Ο διακομιστής δεν απάντησε. Γίνεται έξοδος παρ\' όλα αυτά.',
  'resume.done': 'Ξανά σε σύνδεση',
  'resume.failed': 'Η επανασύνδεση απέτυχε',
  'resume.cancelled': 'Η επανασύνδεση ακυρώθηκε',
  'login.closingOldSession':
    'Ο λογαριασμός είναι ακόμα συνδεδεμένος: κλείνει η παλιά συνεδρία και γίνεται νέα προσπάθεια...',
  'login.tokenRefused': 'Η αποθηκευμένη σύνδεση έληξε. Εισαγάγετε τον κωδικό σας.',
  'login.tokenUnanswered':
    'Ο διακομιστής δεν απάντησε στην αποθηκευμένη σύνδεση. Εισαγάγετε τον κωδικό σας.',
} satisfies Partial<Record<keyof typeof en, string>>;
