/** Bulgarian text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'ОК',
  'common.cancel': 'Отказ',
  'common.close': 'Затвори',
  'common.none': 'Няма',
  'common.create': 'Създай',
  'common.creating': 'Създава се...',
  'common.send': 'Изпрати',
  'common.sending': 'Изпраща се...',
  'common.loading': 'Зарежда се...',
  'common.warning': 'Внимание',
  'common.level': 'Ниво',
  'common.offline': 'Извън линия',
  'common.off': 'Изкл.',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Нямаш достатъчно Zen',
  'options.quality.classic': 'Класическо',
  'options.quality.enhanced': 'Подобрено',
} satisfies Partial<Record<keyof typeof en, string>>;
