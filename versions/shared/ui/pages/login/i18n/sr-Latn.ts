/** sr-Latn text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'Unesi ime naloga i lozinku',
  'login.createAccount': 'Napravi nalog',
  'login.rememberMe': 'Zapamti me?',
  'register.id': 'ID',
  'register.password': 'Lozinka',
  'register.confirm': 'Potvrdi',
  'register.fillEveryField': 'Popuni sva polja.',
  'register.idTooShort': 'Najmanji broj znakova za ID: {min}.',
  'register.idChars': 'ID sme da sadrži samo slova i brojeve.',
  'register.passwordTooShort': 'Najmanji broj znakova za lozinku: {min}.',
  'register.passwordChars': 'Lozinka sme da sadrži samo slova, brojeve i osnovne simbole.',
  'register.mismatch': 'Lozinke se ne poklapaju.',
  'register.unreachable': 'Server nije dostupan.',
  'register.failed': 'Registracija nije uspela ({status}).',
  'register.created': 'Nalog je napravljen. Sada možeš da se prijaviš.',
  'login.savedLogin': 'Sačuvana prijava',
} satisfies Partial<Record<keyof typeof en, string>>;
