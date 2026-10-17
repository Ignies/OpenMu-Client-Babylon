/** sr-Latn text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Otkaži',
  'common.close': 'Zatvori',
  'common.none': 'Ništa',
  'common.create': 'Napravi',
  'common.creating': 'Pravljenje...',
  'common.send': 'Pošalji',
  'common.sending': 'Slanje...',
  'common.loading': 'Učitavanje...',
  'common.warning': 'Upozorenje',
  'common.level': 'Nivo',
  'common.offline': 'Van mreže',
  'common.off': 'Isklj.',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Nedovoljno Zen',
  'options.quality.classic': 'Klasično',
  'options.quality.enhanced': 'Poboljšano',
} satisfies Partial<Record<keyof typeof en, string>>;
