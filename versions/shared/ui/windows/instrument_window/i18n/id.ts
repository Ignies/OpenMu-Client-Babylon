/** id text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'Alat Musik',
  'instrument.load': 'Muat MIDI',
  'instrument.noFile': 'Belum ada file dimuat',
  'instrument.loading': 'Memuat alat musik...',
  'instrument.play': 'Mainkan',
  'instrument.pause': 'Jeda',
  'instrument.stop': 'Berhenti',
  'instrument.loop': 'Ulang',
  'instrument.channels': 'Channel',
  'instrument.band': 'Band',
  'instrument.join': 'Gabung',
  'instrument.leave': 'Keluar',
  'instrument.nearby': 'Pemain musik di dekat',
  'instrument.none': 'Tidak ada yang bermain di dekat sini',
} satisfies Partial<Record<keyof typeof en, string>>;
