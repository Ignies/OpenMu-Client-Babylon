/** Russian text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'Введите имя аккаунта и пароль',
  'login.createAccount': 'Регистрация',
  'login.rememberMe': 'Запомнить меня?',

  'register.id': 'ID',
  'register.password': 'Пароль',
  'register.confirm': 'Повтор',
  'register.fillEveryField': 'Заполните все поля.',
  'register.idTooShort': 'ID должен быть не короче {min} символов.',
  'register.idChars': 'ID может содержать только буквы и цифры.',
  'register.passwordTooShort': 'Пароль должен быть не короче {min} символов.',

  'register.passwordChars': 'Пароль может содержать только буквы, цифры и основные символы.',
  'register.mismatch': 'Пароли не совпадают.',
  'register.unreachable': 'Не удалось связаться с сервером.',
  'register.failed': 'Не удалось создать аккаунт ({status}).',
  'register.created': 'Аккаунт создан. Теперь можно войти.',
} satisfies Partial<Record<keyof typeof en, string>>;
