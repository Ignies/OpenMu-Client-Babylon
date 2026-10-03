/** Russian text of the `reconnect_overlay` interface widget. */

import type en from './en';

export default {
  'resume.title': 'Соединение потеряно',
  'resume.connecting': 'Переподключение... (попытка {attempt})',
  'resume.loggingIn': 'Повторный вход...',
  'resume.selecting': 'Вход в мир...',
  'resume.cancel': 'Отмена',
} satisfies Partial<Record<keyof typeof en, string>>;
