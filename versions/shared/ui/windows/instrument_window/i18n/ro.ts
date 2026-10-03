/** Romanian text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'Instrument',
  'instrument.load': 'Încarcă MIDI',
  'instrument.noFile': 'Niciun fișier încărcat',
  'instrument.loading': 'Se încarcă instrumentul...',
  'instrument.play': 'Redă',
  'instrument.pause': 'Pauză',
  'instrument.stop': 'Oprește',
  'instrument.loop': 'Repetă',
  'instrument.channels': 'Canale',
  'instrument.band': 'Trupă',
  'instrument.join': 'Alătură-te',
  'instrument.leave': 'Părăsește',
  'instrument.nearby': 'Muzicieni în apropiere',
  'instrument.none': 'Nimeni nu cântă în apropiere',
} satisfies Partial<Record<keyof typeof en, string>>;
