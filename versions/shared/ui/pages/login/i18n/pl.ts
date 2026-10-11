/** Polish text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'Podaj nazwę konta i hasło',
  'login.createAccount': 'Załóż konto',
  'login.rememberMe': 'Zapamiętać mnie?',
  'register.id': 'ID',
  'register.password': 'Hasło',
  'register.confirm': 'Powtórz',
  'register.fillEveryField': 'Wypełnij wszystkie pola.',
  'register.idTooShort': 'ID musi mieć co najmniej tyle znaków: {min}.',
  'register.idChars': 'ID może zawierać tylko litery i cyfry.',
  'register.passwordTooShort': 'Hasło musi mieć co najmniej tyle znaków: {min}.',
  'register.passwordChars': 'Hasło może zawierać tylko litery, cyfry i proste symbole.',
  'register.mismatch': 'Hasła nie są zgodne.',
  'register.unreachable': 'Nie udało się połączyć z serwerem.',
  'register.failed': 'Rejestracja nieudana ({status}).',
  'register.created': 'Konto utworzone. Możesz się teraz zalogować.',
  'login.savedLogin': 'Zapisane',
} satisfies Partial<Record<keyof typeof en, string>>;
