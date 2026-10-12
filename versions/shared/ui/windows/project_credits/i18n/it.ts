/** Italian text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'Riconoscimenti',
  'projectCredits.thanks': 'Ringraziamenti speciali',
  'projectCredits.thanksNote': 'I progetti e le persone su cui si basa questo client.',
  'projectCredits.contributors': 'Collaboratori',
  'projectCredits.playtesters': 'Playtest',
  'projectCredits.reporters': 'Segnalazioni di bug',
  'projectCredits.everyoneHeading': 'E',
  'projectCredits.everyone': 'Tutti quelli che hanno contribuito',
  'projectCredits.commits': '{count} commit',
  'projectCredits.reports': '{count} segnalazioni',
  'projectCredits.owners': 'MU Online, il suo client originale e i dati di gioco: Webzen.',
  'projectCredits.season6': 'I titoli di coda originali della Season 6 sono il pulsante Credit nella lista dei server.',
  'projectCredits.loading': 'Lettura dei riconoscimenti...',
} satisfies Partial<Record<keyof typeof en, string>>;
