/** ca text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'D\'acord',
  'common.cancel': 'Cancel·la',
  'common.close': 'Tanca',
  'common.none': 'Cap',
  'common.create': 'Crea',
  'common.creating': 'S\'està creant...',
  'common.send': 'Envia',
  'common.sending': 'S\'està enviant...',
  'common.loading': 'S\'està carregant...',
  'common.warning': 'Avís',
  'common.level': 'Nivell',
  'common.offline': 'Desconnectat',
  'common.off': 'Desactivat',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'No tens prou Zen',
  'options.quality.classic': 'Clàssic',
  'options.quality.enhanced': 'Millorat',
} satisfies Partial<Record<keyof typeof en, string>>;
