/** Italian text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Annulla',
  'common.close': 'Chiudi',
  'common.none': 'Nessuna',
  'common.create': 'Crea',
  'common.creating': 'Creazione...',
  'common.send': 'Invia',
  'common.sending': 'Invio...',
  'common.loading': 'Caricamento...',
  'common.warning': 'Attenzione',
  'common.level': 'Livello',
  'common.offline': 'Non in linea',
  'common.off': 'No',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Zen insufficiente',
  'options.quality.classic': 'Classica',
  'options.quality.enhanced': 'Migliorata',
} satisfies Partial<Record<keyof typeof en, string>>;
