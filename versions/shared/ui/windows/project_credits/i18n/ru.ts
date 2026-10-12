/** Russian text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'Создатели',
  'projectCredits.thanks': 'Особая благодарность',
  'projectCredits.thanksNote': 'Проекты и люди, на которых основан этот клиент.',
  'projectCredits.contributors': 'Участники',
  'projectCredits.playtesters': 'Тестирование',
  'projectCredits.reporters': 'Сообщения об ошибках',
  'projectCredits.everyoneHeading': 'А также',
  'projectCredits.everyone': 'Все, кто помогал',
  'projectCredits.commits': 'коммитов: {count}',
  'projectCredits.reports': 'сообщений: {count}',
  'projectCredits.owners': 'MU Online, его оригинальный клиент и игровые данные: Webzen.',
  'projectCredits.season6': 'Оригинальные титры Season 6 открывает кнопка Credit в списке серверов.',
  'projectCredits.loading': 'Загрузка списка...',
} satisfies Partial<Record<keyof typeof en, string>>;
