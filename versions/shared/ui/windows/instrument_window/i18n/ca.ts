/** ca text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'Instrument',
  'instrument.load': 'Carrega MIDI',
  'instrument.noFile': 'No hi ha cap fitxer carregat',
  'instrument.loading': 'S\'està carregant l\'instrument...',
  'instrument.play': 'Toca',
  'instrument.pause': 'Pausa',
  'instrument.stop': 'Atura',
  'instrument.loop': 'Repeteix',
  'instrument.channels': 'Canals',
  'instrument.band': 'Banda',
  'instrument.join': 'Uneix-t\'hi',
  'instrument.leave': 'Surt',
  'instrument.nearby': 'Músics propers',
  'instrument.none': 'No hi ha ningú tocant a prop',
} satisfies Partial<Record<keyof typeof en, string>>;
