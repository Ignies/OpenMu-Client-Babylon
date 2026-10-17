/** ur text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'ساز',
  'instrument.load': 'MIDI لوڈ کریں',
  'instrument.noFile': 'کوئی فائل لوڈ نہیں',
  'instrument.loading': 'ساز لوڈ ہو رہا ہے...',
  'instrument.play': 'بجائیں',
  'instrument.pause': 'وقفہ',
  'instrument.stop': 'روکیں',
  'instrument.loop': 'دہرائیں',
  'instrument.channels': 'چینل',
  'instrument.band': 'بینڈ',
  'instrument.join': 'شامل ہوں',
  'instrument.leave': 'چھوڑیں',
  'instrument.nearby': 'قریبی فنکار',
  'instrument.none': 'قریب کوئی نہیں بجا رہا',
} satisfies Partial<Record<keyof typeof en, string>>;
