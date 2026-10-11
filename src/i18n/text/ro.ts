/** Romanian text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Anulează',
  'common.close': 'Închide',
  'common.none': 'Niciuna',
  'common.create': 'Creează',
  'common.creating': 'Se creează...',
  'common.send': 'Trimite',
  'common.sending': 'Se trimite...',
  'common.loading': 'Se încarcă...',
  'common.warning': 'Atenție',
  'common.level': 'Nivel',
  'common.offline': 'Deconectat',
  'common.off': 'Oprit',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Nu ai destul Zen',
  'options.quality.classic': 'Clasică',
  'options.quality.enhanced': 'Îmbunătățită',
} satisfies Partial<Record<keyof typeof en, string>>;
