/** eu text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'Instrumentua',
  'instrument.load': 'Kargatu MIDIa',
  'instrument.noFile': 'Ez dago fitxategirik kargatuta',
  'instrument.loading': 'Instrumentua kargatzen...',
  'instrument.play': 'Jo',
  'instrument.pause': 'Pausatu',
  'instrument.stop': 'Gelditu',
  'instrument.loop': 'Begizta',
  'instrument.channels': 'Kanalak',
  'instrument.band': 'Banda',
  'instrument.join': 'Batu',
  'instrument.leave': 'Irten',
  'instrument.nearby': 'Inguruko musikariak',
  'instrument.none': 'Inor ez dago inguruan jotzen',
} satisfies Partial<Record<keyof typeof en, string>>;
