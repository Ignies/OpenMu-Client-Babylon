/** Vietnamese text of the `instrument_window` window. */

import type en from './en';

export default {
  'instrument.title': 'Nhạc cụ',
  'instrument.load': 'Tải MIDI',
  'instrument.noFile': 'Chưa tải tệp nào',
  'instrument.loading': 'Đang tải nhạc cụ...',
  'instrument.play': 'Chơi',
  'instrument.pause': 'Tạm dừng',
  'instrument.stop': 'Dừng',
  'instrument.loop': 'Lặp lại',
  'instrument.channels': 'Kênh',
  'instrument.band': 'Ban nhạc',
  'instrument.join': 'Tham gia',
  'instrument.leave': 'Rời',
  'instrument.nearby': 'Nhạc công gần đây',
  'instrument.none': 'Không có ai đang chơi nhạc gần đây',
} satisfies Partial<Record<keyof typeof en, string>>;
