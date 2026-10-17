/** fa text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'فروشگاه آیتم',
  'bottomBar.characterInfo': 'اطلاعات کاراکتر',
  'bottomBar.inventory': 'کوله‌پشتی',
  'bottomBar.friendList': 'فهرست دوستان',
  'bottomBar.menu': 'منو',
  'bottomBar.noSkill': 'بدون مهارت (کلیک راست = حمله)',
  'bottomBar.emptySlot': '[{key}] خالی',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - کلیک: فهرست مهارت‌ها، کلیک راست: حمله ساده',
  'bottomBar.pickSkill': '[{key}] خالی - برای انتخاب مهارت کلیک کنید',
  'bottomBar.boundSlot': '{name} [{key}] - برای تغییر کلیک راست کنید',
  'bottomBar.clearSlot': 'خالی گذاشتن خانه [{key}]',
  'bottomBar.pet.normal': 'عادی',
  'bottomBar.pet.random': 'شانسی',
  'bottomBar.pet.owner': 'صاحب',
  'bottomBar.pet.target': 'هدف',
  'bottomBar.pet.needTarget': 'نخست هدفی برای کلاغ انتخاب کنید',
  'exp.title': 'تجربه',
} satisfies Partial<Record<keyof typeof en, string>>;
