/** uk text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'Введіть назву акаунта та пароль',
  'login.createAccount': 'Створити акаунт',
  'login.rememberMe': 'Запам’ятати мене?',
  'register.id': 'ID',
  'register.password': 'Пароль',
  'register.confirm': 'Повтор',
  'register.fillEveryField': 'Заповніть усі поля.',
  'register.idTooShort': 'Довжина ID: щонайменше {min} симв.',
  'register.idChars': 'ID може містити лише літери та цифри.',
  'register.passwordTooShort': 'Довжина пароля: щонайменше {min} симв.',
  'register.passwordChars': 'Пароль може містити лише літери, цифри та прості символи.',
  'register.mismatch': 'Паролі не збігаються.',
  'register.unreachable': 'Не вдалося зв’язатися з сервером.',
  'register.failed': 'Не вдалося зареєструватися ({status}).',
  'register.created': 'Акаунт створено. Тепер можна увійти.',
  'login.savedLogin': 'Збережений вхід',
} satisfies Partial<Record<keyof typeof en, string>>;
