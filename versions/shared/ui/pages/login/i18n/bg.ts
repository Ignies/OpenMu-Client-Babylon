/** Bulgarian text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'Въведи име на акаунт и парола',
  'login.createAccount': 'Регистрация',
  'login.rememberMe': 'Запомни ме?',

  'register.id': 'ID',
  'register.password': 'Парола',
  'register.confirm': 'Потвърди',
  'register.fillEveryField': 'Попълни всички полета.',
  'register.idTooShort': 'ID трябва да е поне {min} символа.',
  'register.idChars': 'ID може да съдържа само букви и цифри.',
  'register.passwordTooShort': 'Паролата трябва да е поне {min} символа.',

  'register.passwordChars': 'Паролата може да съдържа само букви, цифри и основни символи.',
  'register.mismatch': 'Паролите не съвпадат.',
  'register.unreachable': 'Няма връзка със сървъра.',
  'register.failed': 'Регистрацията се провали ({status}).',
  'register.created': 'Акаунтът е създаден. Вече можеш да влезеш.',
  'login.savedLogin': 'Запазен вход',
} satisfies Partial<Record<keyof typeof en, string>>;
