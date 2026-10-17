/** hu text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'Add meg a fióknevedet és a jelszavadat',
  'login.createAccount': 'Fiók létrehozása',
  'login.rememberMe': 'Emlékezz rám?',
  'register.id': 'ID',
  'register.password': 'Jelszó',
  'register.confirm': 'Megerősítés',
  'register.fillEveryField': 'Tölts ki minden mezőt.',
  'register.idTooShort': 'Az ID legalább {min} karakter legyen.',
  'register.idChars': 'Az ID csak betűket és számokat tartalmazhat.',
  'register.passwordTooShort': 'A jelszó legalább {min} karakter legyen.',
  'register.passwordChars':
    'A jelszó csak betűket, számokat és egyszerű szimbólumokat tartalmazhat.',
  'register.mismatch': 'A jelszavak nem egyeznek.',
  'register.unreachable': 'A szerver nem érhető el.',
  'register.failed': 'A regisztráció sikertelen ({status}).',
  'register.created': 'A fiók létrejött. Most már beléphetsz.',
  'login.savedLogin': 'Mentett belépés',
} satisfies Partial<Record<keyof typeof en, string>>;
