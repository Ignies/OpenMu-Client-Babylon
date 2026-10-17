/** cs text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'Nástroj',
  'instrument.load': 'Načíst MIDI',
  'instrument.noFile': 'Žádný soubor nenačten',
  'instrument.loading': 'Načítání nástroje...',
  'instrument.play': 'Hrát',
  'instrument.pause': 'Pauza',
  'instrument.stop': 'Zastavit',
  'instrument.loop': 'Smyčka',
  'instrument.channels': 'Kanály',
  'instrument.band': 'Kapela',
  'instrument.join': 'Připojit se',
  'instrument.leave': 'Opustit',
  'instrument.nearby': 'Hudebníci poblíž',
  'instrument.none': 'Poblíž nikdo nehraje',
} satisfies Partial<Record<keyof typeof en, string>>;
