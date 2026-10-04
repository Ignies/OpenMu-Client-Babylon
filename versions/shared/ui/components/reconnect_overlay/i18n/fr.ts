/** French text of the `reconnect_overlay` UI component. */

import type en from './en';

export default {
  'resume.title': 'Connexion perdue',
  'resume.connecting': 'Reconnexion... (tentative {attempt})',
  'resume.loggingIn': 'Reconnexion au compte...',
  'resume.selecting': 'Entrée dans le monde...',
  'resume.cancel': 'Annuler',
} satisfies Partial<Record<keyof typeof en, string>>;
