/** tr text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Oyundan çıkmadan önce Chaos arayüzünü kapat.',
  'exit.noAnswer': 'Sunucu yanıt vermedi. Yine de çıkılıyor.',
  'resume.done': 'Yeniden çevrimiçi',
  'resume.failed': 'Yeniden bağlanılamadı',
  'resume.cancelled': 'Yeniden bağlanma iptal edildi',
  'login.closingOldSession': 'Hesap hâlâ bağlı: eski oturum kapatılıp yeniden deneniyor...',
  'login.tokenRefused': 'Kayıtlı girişinin süresi doldu. Şifreni gir.',
  'login.tokenUnanswered': 'Sunucu kayıtlı girişe yanıt vermedi. Şifreni gir.',
} satisfies Partial<Record<keyof typeof en, string>>;
