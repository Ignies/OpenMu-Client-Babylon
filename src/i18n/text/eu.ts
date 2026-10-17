/** eu text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'Ados',
  'common.cancel': 'Utzi',
  'common.close': 'Itxi',
  'common.none': 'Bat ere ez',
  'common.create': 'Sortu',
  'common.creating': 'Sortzen...',
  'common.send': 'Bidali',
  'common.sending': 'Bidaltzen...',
  'common.loading': 'Kargatzen...',
  'common.warning': 'Abisua',
  'common.level': 'Maila',
  'common.offline': 'Lineaz kanpo',
  'common.off': 'Desaktibatuta',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Ez dago Zen nahikorik',
  'options.quality.classic': 'Klasikoa',
  'options.quality.enhanced': 'Hobetua',
} satisfies Partial<Record<keyof typeof en, string>>;
