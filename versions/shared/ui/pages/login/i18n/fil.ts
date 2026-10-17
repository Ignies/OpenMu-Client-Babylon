/** fil text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'Ilagay ang pangalan ng iyong account at password',
  'login.createAccount': 'Gumawa ng account',
  'login.rememberMe': 'Tandaan ako?',
  'register.id': 'ID',
  'register.password': 'Password',
  'register.confirm': 'Kumpirmahin',
  'register.fillEveryField': 'Punan ang bawat field.',
  'register.idTooShort': 'Dapat ay hindi bababa sa {min} karakter ang ID.',
  'register.idChars': 'Mga titik at numero lamang ang maaaring nasa ID.',
  'register.passwordTooShort': 'Dapat ay hindi bababa sa {min} karakter ang password.',
  'register.passwordChars':
    'Mga titik, numero at simpleng simbolo lamang ang maaaring nasa password.',
  'register.mismatch': 'Hindi magkatugma ang mga password.',
  'register.unreachable': 'Hindi maabot ang server.',
  'register.failed': 'Nabigo ang pagrehistro ({status}).',
  'register.created': 'Nagawa na ang account. Makapag-log in ka na.',
  'login.savedLogin': 'Naka-save na login',
} satisfies Partial<Record<keyof typeof en, string>>;
