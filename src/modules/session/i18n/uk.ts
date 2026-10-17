/** uk text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Закрийте вікно Chaos Machine, перш ніж виходити з гри.',
  'exit.noAnswer': 'Сервер не відповів. Виходимо все одно.',
  'resume.done': 'Знову в мережі',
  'resume.failed': 'Не вдалося перепідключитися',
  'resume.cancelled': 'Перепідключення скасовано',
} satisfies Partial<Record<keyof typeof en, string>>;
