/** Bulgarian text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'Инструмент',
  'instrument.load': 'Зареди MIDI',
  'instrument.noFile': 'Няма зареден файл',
  'instrument.loading': 'Зареждане на инструмента...',
  'instrument.play': 'Свири',
  'instrument.pause': 'Пауза',
  'instrument.stop': 'Стоп',
  'instrument.loop': 'Повтаряй',
  'instrument.channels': 'Канали',
  'instrument.band': 'Група',
  'instrument.join': 'Присъедини се',
  'instrument.leave': 'Напусни',
  'instrument.nearby': 'Изпълнители наблизо',
  'instrument.none': 'Никой не свири наблизо',
} satisfies Partial<Record<keyof typeof en, string>>;
