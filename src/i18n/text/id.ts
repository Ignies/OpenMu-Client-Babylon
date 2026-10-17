/** id text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Batal',
  'common.close': 'Tutup',
  'common.none': 'Tidak ada',
  'common.create': 'Buat',
  'common.creating': 'Membuat...',
  'common.send': 'Kirim',
  'common.sending': 'Mengirim...',
  'common.loading': 'Memuat...',
  'common.warning': 'Peringatan',
  'common.level': 'Level',
  'common.offline': 'Offline',
  'common.off': 'Nonaktif',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Zen tidak cukup',
  'options.quality.classic': 'Klasik',
  'options.quality.enhanced': 'Ditingkatkan',
} satisfies Partial<Record<keyof typeof en, string>>;
