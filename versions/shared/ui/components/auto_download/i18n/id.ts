/** id text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'Mengunduh data game',
  'autoDownload.done': 'Data game selesai diunduh',
  'autoDownload.cancel': 'Batal',
  'autoDownload.hide': 'Sembunyikan (tetap mengunduh)',
  'autoDownload.phase.map': 'Memuat peta: {name}',
  'autoDownload.phase.icons': 'Memuat item',
  'autoDownload.phase.audio': 'Memuat musik dan suara',
  'autoDownload.phase.monsters': 'Memuat karakter dan makhluk',
  'autoDownload.phase.core': 'Memuat antarmuka dan efek',
  'autoDownload.left': 'Sisa {left} MB',
  'autoDownload.received': '{got} MB dari {total} MB terunduh',
  'autoDownload.screenTitle': 'Menyiapkan petualanganmu',
  'autoDownload.screenText': 'File ini disimpan agar game berikutnya dimuat lebih cepat. Hanya untuk pertama kali.',
  'autoDownload.skip': 'Tetap masuk',
  'autoDownload.skipNote': 'Unduhan berlanjut di latar belakang. Jika kamu menutup game, unduhan dilanjutkan dari titik terakhirnya.',
} satisfies Partial<Record<keyof typeof en, string>>;
