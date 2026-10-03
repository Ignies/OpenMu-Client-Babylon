/** Romanian text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'Introdu contul și parola',
  'login.createAccount': 'Creează cont',
  'login.rememberMe': 'Ține-mă minte?',

  'register.id': 'ID',
  'register.password': 'Parolă',
  'register.confirm': 'Confirmă',
  'register.fillEveryField': 'Completează toate câmpurile.',
  'register.idTooShort': 'ID-ul trebuie să aibă cel puțin {min} caractere.',
  'register.idChars': 'ID-ul poate conține doar litere și cifre.',
  'register.passwordTooShort': 'Parola trebuie să aibă cel puțin {min} caractere.',

  'register.passwordChars': 'Parola poate conține doar litere, cifre și simboluri de bază.',
  'register.mismatch': 'Parolele nu se potrivesc.',
  'register.unreachable': 'Serverul nu poate fi contactat.',
  'register.failed': 'Înregistrarea a eșuat ({status}).',
  'register.created': 'Cont creat. Te poți conecta acum.',
} satisfies Partial<Record<keyof typeof en, string>>;
