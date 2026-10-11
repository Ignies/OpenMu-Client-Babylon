/** Romanian text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'Credite',
  'projectCredits.thanks': 'Mulțumiri speciale',
  'projectCredits.thanksNote': 'Proiectele și oamenii pe care se sprijină acest client.',
  'projectCredits.contributors': 'Contribuitori',
  'projectCredits.playtesters': 'Testare',
  'projectCredits.reporters': 'Rapoarte de erori',
  'projectCredits.everyoneHeading': 'Și',
  'projectCredits.everyone': 'Toți cei care au contribuit',
  'projectCredits.commits': '{count} commituri',
  'projectCredits.reports': '{count} rapoarte',
  'projectCredits.owners': 'MU Online, clientul său original și datele jocului: Webzen.',
  'projectCredits.season6': 'Genericul original din Season 6 este butonul Credit din lista de servere.',
  'projectCredits.loading': 'Se citesc creditele...',
} satisfies Partial<Record<keyof typeof en, string>>;
