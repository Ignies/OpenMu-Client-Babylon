/** Italian text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'Strumento',
  'instrument.load': 'Carica MIDI',
  'instrument.noFile': 'Nessun file caricato',
  'instrument.loading': 'Caricamento dello strumento...',
  'instrument.play': 'Suona',
  'instrument.pause': 'Pausa',
  'instrument.stop': 'Ferma',
  'instrument.loop': 'Ripeti',
  'instrument.channels': 'Canali',
  'instrument.band': 'Gruppo',
  'instrument.join': 'Unisciti',
  'instrument.leave': 'Lascia',
  'instrument.nearby': 'Musicisti nelle vicinanze',
  'instrument.none': 'Nessuno sta suonando qui vicino',
} satisfies Partial<Record<keyof typeof en, string>>;
