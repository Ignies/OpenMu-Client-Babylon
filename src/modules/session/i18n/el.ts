/** el text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Κλείστε το παράθυρο του Chaos Machine πριν βγείτε από το παιχνίδι.',
  'exit.noAnswer': 'Ο διακομιστής δεν απάντησε. Γίνεται έξοδος παρ\' όλα αυτά.',
  'resume.done': 'Ξανά σε σύνδεση',
  'resume.failed': 'Η επανασύνδεση απέτυχε',
  'resume.cancelled': 'Η επανασύνδεση ακυρώθηκε',
} satisfies Partial<Record<keyof typeof en, string>>;
