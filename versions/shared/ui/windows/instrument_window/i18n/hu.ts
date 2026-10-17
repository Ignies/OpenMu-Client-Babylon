/** hu text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'Hangszer',
  'instrument.load': 'MIDI betöltése',
  'instrument.noFile': 'Nincs betöltött fájl',
  'instrument.loading': 'Hangszer betöltése...',
  'instrument.play': 'Lejátszás',
  'instrument.pause': 'Szünet',
  'instrument.stop': 'Leállítás',
  'instrument.loop': 'Ismétlés',
  'instrument.channels': 'Csatornák',
  'instrument.band': 'Zenekar',
  'instrument.join': 'Csatlakozás',
  'instrument.leave': 'Kilépés',
  'instrument.nearby': 'Közeli zenészek',
  'instrument.none': 'Senki sem játszik a közelben',
} satisfies Partial<Record<keyof typeof en, string>>;
