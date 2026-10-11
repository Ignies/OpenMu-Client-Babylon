/** Bulgarian text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Затвори прозореца на Хаоса, преди да излезеш от играта.',
  'exit.noAnswer': 'Сървърът не отговори. Излизане въпреки това.',
  'resume.done': 'Отново на линия',
  'resume.failed': 'Неуспешно свързване наново',
  'resume.cancelled': 'Свързването наново е отказано',
  'login.closingOldSession': 'Акаунтът още е в играта: затваряне на старата сесия и нов опит...',
  'login.tokenRefused': 'Запазеният вход е изтекъл. Въведи паролата си.',
} satisfies Partial<Record<keyof typeof en, string>>;
