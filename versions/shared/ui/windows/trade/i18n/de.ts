/** German text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': 'Handel',
  'trade.warnCheck': 'Prüfe jeden Gegenstand, bevor du zustimmst.',
  'trade.warnAlike': 'Gegenstände können gleich aussehen und doch anders sein.',
  'trade.warnCancel': 'Ein abgebrochener Handel gibt alles zurück.',
  'trade.cancel': 'Handel abbrechen',
  'trade.offerZen': 'Zen anbieten',
  'trade.accept': 'Handel annehmen',
} satisfies Partial<Record<keyof typeof en, string>>;
