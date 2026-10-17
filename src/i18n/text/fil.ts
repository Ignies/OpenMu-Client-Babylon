/** fil text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Kanselahin',
  'common.close': 'Isara',
  'common.none': 'Wala',
  'common.create': 'Gumawa',
  'common.creating': 'Ginagawa...',
  'common.send': 'Ipadala',
  'common.sending': 'Ipinapadala...',
  'common.loading': 'Naglo-load...',
  'common.warning': 'Babala',
  'common.level': 'Level',
  'common.offline': 'Offline',
  'common.off': 'Naka-off',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Kulang ang Zen',
  'options.quality.classic': 'Klasiko',
  'options.quality.enhanced': 'Pinahusay',
} satisfies Partial<Record<keyof typeof en, string>>;
