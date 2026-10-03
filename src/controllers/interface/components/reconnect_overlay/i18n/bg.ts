/** Bulgarian text of the `reconnect_overlay` interface widget. */

import type en from './en';

export default {
  'resume.title': 'Връзката прекъсна',
  'resume.connecting': 'Свързване наново... (опит {attempt})',
  'resume.loggingIn': 'Повторно влизане...',
  'resume.selecting': 'Влизане в света...',
  'resume.cancel': 'Отказ',
} satisfies Partial<Record<keyof typeof en, string>>;
