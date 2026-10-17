/** id text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Tutup jendela Chaos sebelum keluar dari game.',
  'exit.noAnswer': 'Server tidak menjawab. Tetap keluar.',
  'resume.done': 'Kembali online',
  'resume.failed': 'Tidak dapat menyambung ulang',
  'resume.cancelled': 'Penyambungan ulang dibatalkan',
} satisfies Partial<Record<keyof typeof en, string>>;
