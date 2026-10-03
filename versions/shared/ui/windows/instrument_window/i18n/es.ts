/** Spanish text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'Instrumento',
  'instrument.load': 'Cargar MIDI',
  'instrument.noFile': 'Ningún archivo cargado',
  'instrument.loading': 'Cargando instrumento...',
  'instrument.play': 'Tocar',
  'instrument.pause': 'Pausa',
  'instrument.stop': 'Detener',
  'instrument.loop': 'Repetir',
  'instrument.channels': 'Canales',
  'instrument.band': 'Banda',
  'instrument.join': 'Unirse',
  'instrument.leave': 'Salir',
  'instrument.nearby': 'Músicos cercanos',
  'instrument.none': 'Nadie está tocando cerca',
} satisfies Partial<Record<keyof typeof en, string>>;
