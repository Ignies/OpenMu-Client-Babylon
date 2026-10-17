/** fa text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'نام حساب و رمز عبور خود را وارد کنید',
  'login.createAccount': 'ساختن حساب',
  'login.rememberMe': 'مرا به خاطر بسپار؟',
  'register.id': 'شناسه',
  'register.password': 'رمز عبور',
  'register.confirm': 'تکرار رمز',
  'register.fillEveryField': 'لطفاً همه خانه‌ها را پر کنید.',
  'register.idTooShort': 'شناسه باید دست‌کم {min} نویسه باشد.',
  'register.idChars': 'شناسه فقط می‌تواند حرف و عدد داشته باشد.',
  'register.passwordTooShort': 'رمز عبور باید دست‌کم {min} نویسه باشد.',
  'register.passwordChars': 'رمز عبور فقط می‌تواند حرف، عدد و نمادهای ساده داشته باشد.',
  'register.mismatch': 'رمزهای عبور یکسان نیستند.',
  'register.unreachable': 'دسترسی به سرور ممکن نشد.',
  'register.failed': 'ثبت‌نام ناموفق بود ({status}).',
  'register.created': 'حساب ساخته شد. اکنون می‌توانید وارد شوید.',
  'login.savedLogin': 'ورود ذخیره‌شده',
} satisfies Partial<Record<keyof typeof en, string>>;
