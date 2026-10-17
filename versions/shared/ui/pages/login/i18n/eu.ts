/** eu text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'Idatzi zure kontuaren izena eta pasahitza',
  'login.createAccount': 'Sortu kontua',
  'login.rememberMe': 'Gogoratu datuak?',
  'register.id': 'ID',
  'register.password': 'Pasahitza',
  'register.confirm': 'Berretsi',
  'register.fillEveryField': 'Bete eremu guztiak, mesedez.',
  'register.idTooShort': 'IDak gutxienez {min} karaktere izan behar ditu.',
  'register.idChars': 'IDak letrak eta zenbakiak soilik izan ditzake.',
  'register.passwordTooShort': 'Pasahitzak gutxienez {min} karaktere izan behar ditu.',
  'register.passwordChars':
    'Pasahitzak letrak, zenbakiak eta oinarrizko ikurrak soilik izan ditzake.',
  'register.mismatch': 'Pasahitzak ez datoz bat.',
  'register.unreachable': 'Ezin izan da zerbitzarira iritsi.',
  'register.failed': 'Erregistroak huts egin du ({status}).',
  'register.created': 'Kontua sortu da. Orain saioa has dezakezu.',
  'login.savedLogin': 'Gordetako saioa',
} satisfies Partial<Record<keyof typeof en, string>>;
