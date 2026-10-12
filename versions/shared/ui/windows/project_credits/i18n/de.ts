/** German text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'Credits',
  'projectCredits.thanks': 'Besonderer Dank',
  'projectCredits.thanksNote': 'Die Projekte und Menschen, auf denen dieser Client aufbaut.',
  'projectCredits.contributors': 'Mitwirkende',
  'projectCredits.playtesters': 'Spieltests',
  'projectCredits.reporters': 'Fehlermeldungen',
  'projectCredits.everyoneHeading': 'Und',
  'projectCredits.everyone': 'Alle, die beigetragen haben',
  'projectCredits.commits': '{count} Commits',
  'projectCredits.reports': '{count} Meldungen',
  'projectCredits.owners': 'MU Online, sein ursprünglicher Client und die Spieldaten: Webzen.',
  'projectCredits.season6': 'Der originale Season-6-Abspann ist der Credit-Knopf in der Serverliste.',
  'projectCredits.loading': 'Credits werden gelesen...',
} satisfies Partial<Record<keyof typeof en, string>>;
