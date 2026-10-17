/** fa text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'در حال دانلود داده‌های بازی',
  'autoDownload.done': 'داده‌های بازی دانلود شد',
  'autoDownload.cancel': 'لغو',
  'autoDownload.hide': 'پنهان کردن (دانلود ادامه دارد)',
  'autoDownload.phase.map': 'در حال بارگذاری نقشه: {name}',
  'autoDownload.phase.icons': 'در حال بارگذاری آیتم‌ها',
  'autoDownload.phase.audio': 'در حال بارگذاری موسیقی و صداها',
  'autoDownload.phase.monsters': 'در حال بارگذاری شخصیت‌ها و موجودات',
  'autoDownload.phase.core': 'در حال بارگذاری رابط کاربری و جلوه‌ها',
  'autoDownload.left': '{left} مگابایت باقی مانده',
  'autoDownload.received': '{got} مگابایت از {total} مگابایت دانلود شد',
  'autoDownload.screenTitle': 'در حال آماده‌سازی ماجراجویی شما',
  'autoDownload.screenText': 'این فایل‌ها نگه داشته می‌شوند تا بازی بعدی شما سریع‌تر بارگذاری شود. فقط بار اول.',
  'autoDownload.skip': 'با این حال وارد شو',
  'autoDownload.skipNote': 'دانلود در پس‌زمینه ادامه می‌یابد. اگر بازی را ببندید، از همان جایی که متوقف شده بود ادامه می‌دهد.',
} satisfies Partial<Record<keyof typeof en, string>>;
