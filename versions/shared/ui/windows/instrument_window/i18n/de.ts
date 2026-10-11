/** German text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'Instrument',
  'instrument.load': 'MIDI laden',
  'instrument.noFile': 'Keine Datei geladen',
  'instrument.loading': 'Instrument wird geladen...',
  'instrument.play': 'Abspielen',
  'instrument.pause': 'Pause',
  'instrument.stop': 'Stopp',
  'instrument.loop': 'Wiederholen',
  'instrument.channels': 'Kanäle',
  'instrument.band': 'Band',
  'instrument.join': 'Beitreten',
  'instrument.leave': 'Verlassen',
  'instrument.nearby': 'Musiker in der Nähe',
  'instrument.none': 'Niemand spielt in der Nähe',
} satisfies Partial<Record<keyof typeof en, string>>;
