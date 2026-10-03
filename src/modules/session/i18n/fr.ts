/** French text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Ferme la fenêtre du Chaos avant de quitter le jeu.',
  'exit.noAnswer': 'Le serveur n’a pas répondu. Sortie quand même.',
  'resume.done': 'De retour en ligne',
  'resume.failed': 'Reconnexion impossible',
  'resume.cancelled': 'Reconnexion annulée',
} satisfies Partial<Record<keyof typeof en, string>>;
