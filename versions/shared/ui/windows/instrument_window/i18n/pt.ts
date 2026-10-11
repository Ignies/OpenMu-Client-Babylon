/** Portuguese text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'Instrumento',
  'instrument.load': 'Carregar MIDI',
  'instrument.noFile': 'Nenhum arquivo carregado',
  'instrument.loading': 'Carregando instrumento...',
  'instrument.play': 'Tocar',
  'instrument.pause': 'Pausar',
  'instrument.stop': 'Parar',
  'instrument.loop': 'Repetir',
  'instrument.channels': 'Canais',
  'instrument.band': 'Banda',
  'instrument.join': 'Entrar',
  'instrument.leave': 'Sair',
  'instrument.nearby': 'Músicos por perto',
  'instrument.none': 'Ninguém está tocando por perto',
} satisfies Partial<Record<keyof typeof en, string>>;
