/** Bulgarian text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Затвори прозореца на Хаоса, преди да излезеш от играта.',
  'exit.noAnswer': 'Сървърът не отговори. Излизане въпреки това.',
  'resume.done': 'Отново на линия',
  'resume.failed': 'Неуспешно свързване наново',
  'resume.cancelled': 'Свързването наново е отказано',
} satisfies Partial<Record<keyof typeof en, string>>;
