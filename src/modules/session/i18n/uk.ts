/** uk text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Закрийте вікно Chaos Machine, перш ніж виходити з гри.',
  'exit.noAnswer': 'Сервер не відповів. Виходимо все одно.',
  'resume.done': 'Знову в мережі',
  'resume.failed': 'Не вдалося перепідключитися',
  'resume.cancelled': 'Перепідключення скасовано',
  'login.closingOldSession': 'Акаунт досі в мережі: закриваємо стару сесію й пробуємо знову...',
  'login.tokenRefused': 'Термін збереженого входу минув. Введіть пароль.',
  'login.tokenUnanswered': 'Сервер не відповів на збережений вхід. Введіть пароль.',
} satisfies Partial<Record<keyof typeof en, string>>;
