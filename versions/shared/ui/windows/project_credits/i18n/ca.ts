/** ca text of `versions/shared/ui/windows/project_credits`. */

import type en from './en';

export default {
  'projectCredits.title': 'Crèdits',
  'projectCredits.thanks': 'Agraïments especials',
  'projectCredits.thanksNote':
    'Els projectes i les persones sobre els quals es construeix aquest client.',
  'projectCredits.contributors': 'Col·laboradors',
  'projectCredits.playtesters': 'Proves de joc',
  'projectCredits.reporters': 'Informes d\'errors',
  'projectCredits.everyoneHeading': 'I',
  'projectCredits.everyone': 'Tothom qui hi ha col·laborat',
  'projectCredits.commits': '{count} commits',
  'projectCredits.reports': '{count} informes',
  'projectCredits.owners': 'MU Online, el seu client original i les dades del joc: Webzen.',
  'projectCredits.season6':
    'Els crèdits originals de la Season 6 són al botó Credit de la llista de servidors.',
  'projectCredits.loading': 'S\'estan llegint els crèdits...',
} satisfies Partial<Record<keyof typeof en, string>>;
