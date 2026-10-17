/** tr text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'Enstrüman',
  'instrument.load': 'MIDI yükle',
  'instrument.noFile': 'Dosya yüklenmedi',
  'instrument.loading': 'Enstrüman yükleniyor...',
  'instrument.play': 'Çal',
  'instrument.pause': 'Duraklat',
  'instrument.stop': 'Durdur',
  'instrument.loop': 'Döngü',
  'instrument.channels': 'Kanallar',
  'instrument.band': 'Orkestra',
  'instrument.join': 'Katıl',
  'instrument.leave': 'Ayrıl',
  'instrument.nearby': 'Yakındaki müzisyenler',
  'instrument.none': 'Yakında çalan kimse yok',
} satisfies Partial<Record<keyof typeof en, string>>;
