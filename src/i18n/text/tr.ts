/** tr text of `src/i18n/text`. */

import type en from './en';

export default {
  'common.ok': 'Tamam',
  'common.cancel': 'İptal',
  'common.close': 'Kapat',
  'common.none': 'Yok',
  'common.create': 'Oluştur',
  'common.creating': 'Oluşturuluyor...',
  'common.send': 'Gönder',
  'common.sending': 'Gönderiliyor...',
  'common.loading': 'Yükleniyor...',
  'common.warning': 'Uyarı',
  'common.level': 'Seviye',
  'common.offline': 'Çevrimdışı',
  'common.off': 'Kapalı',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Yetersiz Zen',
  'options.quality.classic': 'Klasik',
  'options.quality.enhanced': 'Gelişmiş',
} satisfies Partial<Record<keyof typeof en, string>>;
