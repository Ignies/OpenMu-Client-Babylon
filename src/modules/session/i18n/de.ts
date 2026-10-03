/** German text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Schließe das Chaos-Fenster, bevor du das Spiel verlässt.',
  'exit.noAnswer': 'Der Server hat nicht geantwortet. Es wird trotzdem beendet.',
  'resume.done': 'Wieder online',
  'resume.failed': 'Neuverbindung fehlgeschlagen',
  'resume.cancelled': 'Neuverbindung abgebrochen',
} satisfies Partial<Record<keyof typeof en, string>>;
