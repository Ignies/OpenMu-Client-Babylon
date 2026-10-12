/** French text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'Crédits',
  'projectCredits.thanks': 'Remerciements',
  'projectCredits.thanksNote': 'Les projets et les personnes sur lesquels ce client repose.',
  'projectCredits.contributors': 'Contributeurs',
  'projectCredits.playtesters': 'Tests de jeu',
  'projectCredits.reporters': 'Rapports de bugs',
  'projectCredits.everyoneHeading': 'Et',
  'projectCredits.everyone': 'Tous ceux qui ont contribué',
  'projectCredits.commits': '{count} commits',
  'projectCredits.reports': '{count} rapports',
  'projectCredits.owners': "MU Online, son client d'origine et ses données de jeu : Webzen.",
  'projectCredits.season6': 'Le générique original de la Season 6 est le bouton Credit de la liste des serveurs.',
  'projectCredits.loading': 'Lecture des crédits...',
} satisfies Partial<Record<keyof typeof en, string>>;
