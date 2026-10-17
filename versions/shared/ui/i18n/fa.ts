/** fa text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'در حال بارگذاری فهرست سرورها...',
  'servers.serverName': 'سرور {number}',
  'login.id': 'شناسه',
  'login.password': 'رمز عبور',
  'options.title': 'تنظیمات',
  'options.texturePack': 'بافت مدل‌ها',
  'options.texturePack.original': 'اصلی',
  'options.texturePackHint': 'بافت‌های مدل با وضوح بالاتر، بدون بارگذاری دوباره اعمال می‌شود',
  'session.toLevel': 'تا سطح بعد',
  'bottomBar.pet.normalTip': 'پیش‌فرض: کلاغ کنار شما می‌ماند',
  'bottomBar.pet.randomTip': 'تصادفی: به هر چیز نزدیک حمله می‌کند',
  'bottomBar.pet.ownerTip': 'صاحب: به هرچه شما حمله کنید حمله می‌کند',
  'bottomBar.pet.targetTip': 'هدف: به هدف کنونی شما حمله می‌کند',
  'skills.title': 'مهارت‌ها',
  'skills.empty': 'مهارتی آموخته نشده',
  'chatRoom.leave': 'ترک',
  'command.trade': 'معامله',
  'command.purchase': 'خرید',
  'command.party': 'گروه',
  'command.whisper': 'نجوا',
  'command.follow': 'دنبال کردن',
  'command.battle': 'نبرد',
  'warp.title': 'پنجره فرمان انتقال',
  'instrument.putAway': 'کنار گذاشتن',
  'prompt.trade': 'معامله',
} satisfies Partial<Record<keyof typeof en, string>>;
