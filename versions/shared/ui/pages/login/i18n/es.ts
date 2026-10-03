/** Spanish text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'Escribe tu cuenta y tu contraseña',
  'login.createAccount': 'Crear cuenta',
  'login.rememberMe': '¿Recordarme?',

  'register.id': 'ID',
  'register.password': 'Contraseña',
  'register.confirm': 'Confirmar',
  'register.fillEveryField': 'Rellena todos los campos.',
  'register.idTooShort': 'El ID debe tener al menos {min} caracteres.',
  'register.idChars': 'El ID solo puede tener letras y números.',
  'register.passwordTooShort': 'La contraseña debe tener al menos {min} caracteres.',

  'register.passwordChars': 'La contraseña solo puede tener letras, números y símbolos básicos.',
  'register.mismatch': 'Las contraseñas no coinciden.',
  'register.unreachable': 'No se pudo contactar con el servidor.',
  'register.failed': 'No se pudo crear la cuenta ({status}).',
  'register.created': 'Cuenta creada. Ya puedes iniciar sesión.',
} satisfies Partial<Record<keyof typeof en, string>>;
