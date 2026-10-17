/** tr text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Oyundan çıkmadan önce Chaos arayüzünü kapat.',
  'exit.noAnswer': 'Sunucu yanıt vermedi. Yine de çıkılıyor.',
  'resume.done': 'Yeniden çevrimiçi',
  'resume.failed': 'Yeniden bağlanılamadı',
  'resume.cancelled': 'Yeniden bağlanma iptal edildi',
} satisfies Partial<Record<keyof typeof en, string>>;
