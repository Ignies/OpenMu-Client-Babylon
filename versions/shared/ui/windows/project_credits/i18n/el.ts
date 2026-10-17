/** el text of `versions/shared/ui/windows/project_credits`. */

import type en from './en';

export default {
  'projectCredits.title': 'Συντελεστές',
  'projectCredits.thanks': 'Ειδικές ευχαριστίες',
  'projectCredits.thanksNote':
    'Τα έργα και οι άνθρωποι πάνω στους οποίους στηρίζεται αυτός ο client.',
  'projectCredits.contributors': 'Συνεισφέροντες',
  'projectCredits.playtesters': 'Δοκιμές παιχνιδιού',
  'projectCredits.reporters': 'Αναφορές σφαλμάτων',
  'projectCredits.everyoneHeading': 'Και',
  'projectCredits.everyone': 'Όλοι όσοι συνεισέφεραν',
  'projectCredits.commits': 'Commits: {count}',
  'projectCredits.reports': 'Αναφορές: {count}',
  'projectCredits.owners': 'MU Online, ο αρχικός client και τα δεδομένα του παιχνιδιού: Webzen.',
  'projectCredits.season6':
    'Οι αρχικοί τίτλοι του Season 6 βρίσκονται στο κουμπί Credit της λίστας διακομιστών.',
  'projectCredits.loading': 'Ανάγνωση συντελεστών...',
} satisfies Partial<Record<keyof typeof en, string>>;
