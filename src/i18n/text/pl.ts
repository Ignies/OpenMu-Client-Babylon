/** Polish text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Anuluj',
  'common.close': 'Zamknij',
  'common.none': 'Brak',
  'common.create': 'Utwórz',
  'common.creating': 'Tworzenie...',
  'common.send': 'Wyślij',
  'common.sending': 'Wysyłanie...',
  'common.loading': 'Wczytywanie...',
  'common.warning': 'Uwaga',
  'common.level': 'Poziom',
  'common.offline': 'Offline',
  'common.off': 'Wył.',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Za mało Zen',
  'options.quality.classic': 'Klasyczne',
  'options.quality.enhanced': 'Ulepszone',
} satisfies Partial<Record<keyof typeof en, string>>;
