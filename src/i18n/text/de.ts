/** German text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Abbrechen',
  'common.close': 'Schließen',
  'common.none': 'Keine',
  'common.create': 'Erstellen',
  'common.creating': 'Wird erstellt...',
  'common.send': 'Senden',
  'common.sending': 'Wird gesendet...',
  'common.loading': 'Wird geladen...',
  'common.warning': 'Achtung',
  'common.level': 'Level',
  'common.offline': 'Offline',
  'common.off': 'Aus',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Nicht genug Zen',
  'options.quality.classic': 'Klassisch',
  'options.quality.enhanced': 'Verbessert',
} satisfies Partial<Record<keyof typeof en, string>>;
