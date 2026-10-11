/** German text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'Gib deinen Kontonamen und dein Passwort ein',
  'login.createAccount': 'Registrieren',
  'login.rememberMe': 'Angemeldet bleiben?',

  'register.id': 'ID',
  'register.password': 'Passwort',
  'register.confirm': 'Bestätigen',
  'register.fillEveryField': 'Bitte fülle alle Felder aus.',
  'register.idTooShort': 'Die ID muss mindestens {min} Zeichen haben.',
  'register.idChars': 'Die ID darf nur Buchstaben und Zahlen enthalten.',
  'register.passwordTooShort': 'Das Passwort muss mindestens {min} Zeichen haben.',

  'register.passwordChars': 'Das Passwort darf nur Buchstaben, Zahlen und einfache Symbole enthalten.',
  'register.mismatch': 'Die Passwörter stimmen nicht überein.',
  'register.unreachable': 'Server nicht erreichbar.',
  'register.failed': 'Registrierung fehlgeschlagen ({status}).',
  'register.created': 'Konto erstellt. Du kannst dich jetzt anmelden.',
  'login.savedLogin': 'Gespeichert',
} satisfies Partial<Record<keyof typeof en, string>>;
