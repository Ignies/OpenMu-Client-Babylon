/** hu text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Mégse',
  'common.close': 'Bezárás',
  'common.none': 'Nincs',
  'common.create': 'Létrehozás',
  'common.creating': 'Létrehozás...',
  'common.send': 'Küldés',
  'common.sending': 'Küldés...',
  'common.loading': 'Betöltés...',
  'common.warning': 'Figyelem',
  'common.level': 'Szint',
  'common.offline': 'Offline',
  'common.off': 'Ki',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Nincs elég Zen',
  'options.quality.classic': 'Klasszikus',
  'options.quality.enhanced': 'Fejlett',
} satisfies Partial<Record<keyof typeof en, string>>;
