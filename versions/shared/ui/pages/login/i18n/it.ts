/** Italian text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'Inserisci account e password',
  'login.createAccount': 'Crea account',
  'login.rememberMe': 'Ricordami?',

  'register.id': 'ID',
  'register.password': 'Password',
  'register.confirm': 'Conferma',
  'register.fillEveryField': 'Compila tutti i campi.',
  'register.idTooShort': 'L’ID deve avere almeno {min} caratteri.',
  'register.idChars': 'L’ID può contenere solo lettere e numeri.',
  'register.passwordTooShort': 'La password deve avere almeno {min} caratteri.',

  'register.passwordChars': 'La password può contenere solo lettere, numeri e simboli semplici.',
  'register.mismatch': 'Le password non coincidono.',
  'register.unreachable': 'Impossibile raggiungere il server.',
  'register.failed': 'Registrazione non riuscita ({status}).',
  'register.created': 'Account creato. Ora puoi accedere.',
  'login.savedLogin': 'Accesso salvato',
} satisfies Partial<Record<keyof typeof en, string>>;
