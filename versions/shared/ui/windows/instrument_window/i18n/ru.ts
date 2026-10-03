/** Russian text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'Инструмент',
  'instrument.load': 'Загрузить MIDI',
  'instrument.noFile': 'Файл не загружен',
  'instrument.loading': 'Загрузка инструмента...',
  'instrument.play': 'Играть',
  'instrument.pause': 'Пауза',
  'instrument.stop': 'Стоп',
  'instrument.loop': 'Повтор',
  'instrument.channels': 'Каналы',
  'instrument.band': 'Группа',
  'instrument.join': 'Присоединиться',
  'instrument.leave': 'Выйти',
  'instrument.nearby': 'Музыканты поблизости',
  'instrument.none': 'Поблизости никто не играет',
} satisfies Partial<Record<keyof typeof en, string>>;
