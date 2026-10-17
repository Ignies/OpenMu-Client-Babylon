/** sr-Latn text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'Instrument',
  'instrument.load': 'Učitaj MIDI',
  'instrument.noFile': 'Nijedna datoteka nije učitana',
  'instrument.loading': 'Učitavanje instrumenta...',
  'instrument.play': 'Sviraj',
  'instrument.pause': 'Pauza',
  'instrument.stop': 'Zaustavi',
  'instrument.loop': 'Ponavljanje',
  'instrument.channels': 'Kanali',
  'instrument.band': 'Bend',
  'instrument.join': 'Pridruži se',
  'instrument.leave': 'Napusti',
  'instrument.nearby': 'Muzičari u blizini',
  'instrument.none': 'Niko ne svira u blizini',
} satisfies Partial<Record<keyof typeof en, string>>;
