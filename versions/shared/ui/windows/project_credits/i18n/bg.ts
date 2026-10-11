/** Bulgarian text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'Признателност',
  'projectCredits.thanks': 'Специални благодарности',
  'projectCredits.thanksNote': 'Проектите и хората, върху които е изграден този клиент.',
  'projectCredits.contributors': 'Сътрудници',
  'projectCredits.playtesters': 'Тестване',
  'projectCredits.reporters': 'Доклади за грешки',
  'projectCredits.everyoneHeading': 'И',
  'projectCredits.everyone': 'Всички, които допринесоха',
  'projectCredits.commits': '{count} къмита',
  'projectCredits.reports': '{count} доклада',
  'projectCredits.owners': 'MU Online, оригиналният клиент и данните на играта: Webzen.',
  'projectCredits.season6': 'Оригиналните надписи на Season 6 са бутонът Credit в списъка със сървъри.',
  'projectCredits.loading': 'Зареждане...',
} satisfies Partial<Record<keyof typeof en, string>>;
