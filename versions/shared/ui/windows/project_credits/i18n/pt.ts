/** Portuguese text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'Créditos',
  'projectCredits.thanks': 'Agradecimentos especiais',
  'projectCredits.thanksNote': 'Os projetos e as pessoas em que este cliente se baseia.',
  'projectCredits.contributors': 'Colaboradores',
  'projectCredits.playtesters': 'Testes de jogo',
  'projectCredits.reporters': 'Relatos de bugs',
  'projectCredits.everyoneHeading': 'E',
  'projectCredits.everyone': 'Todos que contribuíram',
  'projectCredits.commits': '{count} commits',
  'projectCredits.reports': '{count} relatos',
  'projectCredits.owners': 'MU Online, seu cliente original e dados de jogo: Webzen.',
  'projectCredits.season6': 'Os créditos originais da Season 6 ficam no botão Credit da lista de servidores.',
  'projectCredits.loading': 'Lendo os créditos...',
} satisfies Partial<Record<keyof typeof en, string>>;
