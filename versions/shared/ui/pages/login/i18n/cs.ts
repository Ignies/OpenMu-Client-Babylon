/** cs text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'Zadej název účtu a heslo',
  'login.createAccount': 'Vytvořit účet',
  'login.rememberMe': 'Zapamatovat si mě?',
  'register.id': 'ID',
  'register.password': 'Heslo',
  'register.confirm': 'Potvrzení',
  'register.fillEveryField': 'Vyplň všechna pole.',
  'register.idTooShort': 'Minimální délka ID: {min} zn.',
  'register.idChars': 'ID smí obsahovat jen písmena a číslice.',
  'register.passwordTooShort': 'Minimální délka hesla: {min} zn.',
  'register.passwordChars': 'Heslo smí obsahovat jen písmena, číslice a základní symboly.',
  'register.mismatch': 'Hesla se neshodují.',
  'register.unreachable': 'Nepodařilo se spojit se serverem.',
  'register.failed': 'Registrace se nezdařila ({status}).',
  'register.created': 'Účet vytvořen. Nyní se můžeš přihlásit.',
  'login.savedLogin': 'Uložené přihlášení',
} satisfies Partial<Record<keyof typeof en, string>>;
