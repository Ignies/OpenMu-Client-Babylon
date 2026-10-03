/** Polish text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'Instrument',
  'instrument.load': 'Wczytaj MIDI',
  'instrument.noFile': 'Nie wczytano pliku',
  'instrument.loading': 'Wczytywanie instrumentu...',
  'instrument.play': 'Graj',
  'instrument.pause': 'Pauza',
  'instrument.stop': 'Zatrzymaj',
  'instrument.loop': 'Pętla',
  'instrument.channels': 'Kanały',
  'instrument.band': 'Zespół',
  'instrument.join': 'Dołącz',
  'instrument.leave': 'Opuść',
  'instrument.nearby': 'Muzycy w pobliżu',
  'instrument.none': 'Nikt nie gra w pobliżu',
} satisfies Partial<Record<keyof typeof en, string>>;
