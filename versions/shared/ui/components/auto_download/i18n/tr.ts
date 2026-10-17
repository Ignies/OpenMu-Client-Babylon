/** tr text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'Oyun verileri indiriliyor',
  'autoDownload.done': 'Oyun verileri indirildi',
  'autoDownload.cancel': 'İptal',
  'autoDownload.hide': 'Gizle (indirme sürer)',
  'autoDownload.phase.map': 'Harita yükleniyor: {name}',
  'autoDownload.phase.icons': 'Eşyalar yükleniyor',
  'autoDownload.phase.audio': 'Müzik ve sesler yükleniyor',
  'autoDownload.phase.monsters': 'Karakterler ve yaratıklar yükleniyor',
  'autoDownload.phase.core': 'Arayüz ve efektler yükleniyor',
  'autoDownload.left': '{left} MB kaldı',
  'autoDownload.received': '{total} MB\'ın {got} MB\'ı indirildi',
  'autoDownload.screenTitle': 'Maceran hazırlanıyor',
  'autoDownload.screenText': 'Bu dosyalar saklanır, böylece bir sonraki oyunun daha hızlı yüklenir. Yalnızca ilk seferde.',
  'autoDownload.skip': 'Yine de gir',
  'autoDownload.skipNote': 'İndirme arka planda sürer. Oyunu kapatırsan kaldığı yerden devam eder.',
} satisfies Partial<Record<keyof typeof en, string>>;
