/** fa text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'پس از بستن پنجره آشوب از بازی خارج شوید.',
  'exit.noAnswer': 'سرور پاسخ نداد. به هر حال خارج می‌شویم.',
  'resume.done': 'دوباره آنلاین',
  'resume.failed': 'اتصال دوباره ممکن نشد',
  'resume.cancelled': 'اتصال دوباره لغو شد',
  'login.closingOldSession': 'حساب هنوز متصل است: بستن نشست قدیمی و تلاش دوباره...',
  'login.tokenRefused': 'ورود ذخیره‌شده شما منقضی شده است. رمز عبور را وارد کنید.',
  'login.tokenUnanswered': 'سرور به ورود ذخیره‌شده پاسخ نداد. رمز عبور را وارد کنید.',
} satisfies Partial<Record<keyof typeof en, string>>;
