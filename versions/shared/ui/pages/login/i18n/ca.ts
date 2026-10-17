/** ca text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'Introdueix el nom del compte i la contrasenya',
  'login.createAccount': 'Crea un compte',
  'login.rememberMe': 'Recorda\'m?',
  'register.id': 'ID',
  'register.password': 'Contrasenya',
  'register.confirm': 'Confirma',
  'register.fillEveryField': 'Omple tots els camps.',
  'register.idTooShort': 'L\'ID ha de tenir com a mínim {min} caràcters.',
  'register.idChars': 'L\'ID només pot contenir lletres i números.',
  'register.passwordTooShort': 'La contrasenya ha de tenir com a mínim {min} caràcters.',
  'register.passwordChars': 'La contrasenya només pot contenir lletres, números i símbols bàsics.',
  'register.mismatch': 'Les contrasenyes no coincideixen.',
  'register.unreachable': 'No s\'ha pogut connectar amb el servidor.',
  'register.failed': 'El registre ha fallat ({status}).',
  'register.created': 'S\'ha creat el compte. Ja pots iniciar la sessió.',
} satisfies Partial<Record<keyof typeof en, string>>;
