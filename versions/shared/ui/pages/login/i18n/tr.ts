/** tr text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'Hesap adını ve şifreni gir',
  'login.createAccount': 'Hesap oluştur',
  'login.rememberMe': 'Beni hatırla',
  'register.id': 'ID',
  'register.password': 'Şifre',
  'register.confirm': 'Tekrar',
  'register.fillEveryField': 'Lütfen tüm alanları doldur.',
  'register.idTooShort': 'ID en az {min} karakter olmalı.',
  'register.idChars': 'ID yalnızca harf ve rakam içerebilir.',
  'register.passwordTooShort': 'Şifre en az {min} karakter olmalı.',
  'register.passwordChars': 'Şifre yalnızca harf, rakam ve temel simgeler içerebilir.',
  'register.mismatch': 'Şifreler eşleşmiyor.',
  'register.unreachable': 'Sunucuya ulaşılamadı.',
  'register.failed': 'Kayıt başarısız ({status}).',
  'register.created': 'Hesap oluşturuldu. Artık giriş yapabilirsin.',
} satisfies Partial<Record<keyof typeof en, string>>;
