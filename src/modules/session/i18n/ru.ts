/** Russian text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Закройте окно Хаоса, прежде чем выходить из игры.',
  'exit.noAnswer': 'Сервер не ответил. Выходим всё равно.',
  'resume.done': 'Снова в сети',
  'resume.failed': 'Не удалось переподключиться',
  'resume.cancelled': 'Переподключение отменено',
} satisfies Partial<Record<keyof typeof en, string>>;
