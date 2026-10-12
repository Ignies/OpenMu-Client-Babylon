/** Spanish text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'Créditos',
  'projectCredits.thanks': 'Agradecimientos especiales',
  'projectCredits.thanksNote': 'Los proyectos y personas sobre los que se construye este cliente.',
  'projectCredits.contributors': 'Colaboradores',
  'projectCredits.playtesters': 'Pruebas de juego',
  'projectCredits.reporters': 'Informes de errores',
  'projectCredits.everyoneHeading': 'Y',
  'projectCredits.everyone': 'Todos los que colaboraron',
  'projectCredits.commits': '{count} commits',
  'projectCredits.reports': '{count} informes',
  'projectCredits.owners': 'MU Online, su cliente original y sus datos de juego: Webzen.',
  'projectCredits.season6': 'Los créditos originales de la Season 6 están en el botón Credit de la lista de servidores.',
  'projectCredits.loading': 'Leyendo los créditos...',
} satisfies Partial<Record<keyof typeof en, string>>;
