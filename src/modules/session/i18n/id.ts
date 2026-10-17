/** id text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Tutup jendela Chaos sebelum keluar dari game.',
  'exit.noAnswer': 'Server tidak menjawab. Tetap keluar.',
  'resume.done': 'Kembali online',
  'resume.failed': 'Tidak dapat menyambung ulang',
  'resume.cancelled': 'Penyambungan ulang dibatalkan',
  'login.closingOldSession': 'Akun masih terhubung: menutup sesi lama dan mencoba lagi...',
  'login.tokenRefused': 'Login tersimpanmu sudah kedaluwarsa. Masukkan kata sandimu.',
  'login.tokenUnanswered': 'Server tidak menjawab login tersimpan. Masukkan kata sandimu.',
} satisfies Partial<Record<keyof typeof en, string>>;
