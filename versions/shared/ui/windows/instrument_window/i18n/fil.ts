/** fil text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'Instrumento',
  'instrument.load': 'I-load ang MIDI',
  'instrument.noFile': 'Walang file na naka-load',
  'instrument.loading': 'Nilo-load ang instrumento...',
  'instrument.play': 'Tugtugin',
  'instrument.pause': 'I-pause',
  'instrument.stop': 'Itigil',
  'instrument.loop': 'Ulitin',
  'instrument.channels': 'Mga channel',
  'instrument.band': 'Banda',
  'instrument.join': 'Sumali',
  'instrument.leave': 'Umalis',
  'instrument.nearby': 'Mga tumutugtog sa malapit',
  'instrument.none': 'Walang tumutugtog sa malapit',
} satisfies Partial<Record<keyof typeof en, string>>;
