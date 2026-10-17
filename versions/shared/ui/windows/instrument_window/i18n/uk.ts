/** uk text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'Інструмент',
  'instrument.load': 'Завантажити MIDI',
  'instrument.noFile': 'Файл не завантажено',
  'instrument.loading': 'Завантаження інструмента...',
  'instrument.play': 'Грати',
  'instrument.pause': 'Пауза',
  'instrument.stop': 'Стоп',
  'instrument.loop': 'Повтор',
  'instrument.channels': 'Канали',
  'instrument.band': 'Гурт',
  'instrument.join': 'Приєднатися',
  'instrument.leave': 'Вийти',
  'instrument.nearby': 'Музиканти поблизу',
  'instrument.none': 'Поблизу ніхто не грає',
} satisfies Partial<Record<keyof typeof en, string>>;
