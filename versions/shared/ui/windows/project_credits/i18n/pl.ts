/** Polish text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'Twórcy',
  'projectCredits.thanks': 'Specjalne podziękowania',
  'projectCredits.thanksNote': 'Projekty i ludzie, na których opiera się ten klient.',
  'projectCredits.contributors': 'Współtwórcy',
  'projectCredits.playtesters': 'Testy gry',
  'projectCredits.reporters': 'Zgłoszenia błędów',
  'projectCredits.everyoneHeading': 'Oraz',
  'projectCredits.everyone': 'Wszyscy, którzy pomogli',
  'projectCredits.commits': 'commity: {count}',
  'projectCredits.reports': 'zgłoszenia: {count}',
  'projectCredits.owners': 'MU Online, jego oryginalny klient i dane gry: Webzen.',
  'projectCredits.season6': 'Oryginalne napisy Season 6 są pod przyciskiem Credit na liście serwerów.',
  'projectCredits.loading': 'Wczytywanie twórców...',
} satisfies Partial<Record<keyof typeof en, string>>;
