/** cs text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Zrušit',
  'common.close': 'Zavřít',
  'common.none': 'Žádné',
  'common.create': 'Vytvořit',
  'common.creating': 'Vytváření...',
  'common.send': 'Odeslat',
  'common.sending': 'Odesílání...',
  'common.loading': 'Načítání...',
  'common.warning': 'Upozornění',
  'common.level': 'Úroveň',
  'common.offline': 'Offline',
  'common.off': 'Vyp.',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Nedostatek Zen',
  'options.quality.classic': 'Klasické',
  'options.quality.enhanced': 'Vylepšené',
} satisfies Partial<Record<keyof typeof en, string>>;
