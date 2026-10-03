/** Polish text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Zamknij okno Chaos przed wyjściem z gry.',
  'exit.noAnswer': 'Serwer nie odpowiedział. Wychodzenie mimo to.',
  'resume.done': 'Znów online',
  'resume.failed': 'Nie udało się połączyć ponownie',
  'resume.cancelled': 'Ponowne łączenie anulowane',
} satisfies Partial<Record<keyof typeof en, string>>;
