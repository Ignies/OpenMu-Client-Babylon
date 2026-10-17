/** cs text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Před ukončením hry zavři okno Chaos Machine.',
  'exit.noAnswer': 'Server neodpověděl. Hra se přesto ukončí.',
  'resume.done': 'Znovu online',
  'resume.failed': 'Nepodařilo se znovu připojit',
  'resume.cancelled': 'Opětovné připojení zrušeno',
  'login.closingOldSession': 'Účet je stále připojen: ukončuji starou relaci a zkouším to znovu...',
  'login.tokenRefused': 'Tvoje uložené přihlášení vypršelo. Zadej heslo.',
  'login.tokenUnanswered': 'Server na uložené přihlášení neodpověděl. Zadej heslo.',
} satisfies Partial<Record<keyof typeof en, string>>;
