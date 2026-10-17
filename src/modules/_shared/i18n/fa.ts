/** fa text of `src/modules/_shared`. */

import type en from './en';

export default {
  'personalShop.needLevel': 'فروشگاه شخصی به کاراکتر سطح 6 نیاز دارد.',
  'personalShop.openFailed': 'فروشگاه باز نشد.',
  'personalShop.cannotSell': 'این آیتم را نمی‌توان در فروشگاه فروخت.',
  'personalShop.itemGone': 'آن آیتم دیگر نیست.',
  'guild.alreadyInGuild': 'شما هم‌اکنون عضو یک انجمن هستید.',
  'guild.notGuildMaster': 'آن بازیکن رئیس انجمن نیست.',
  'guild.requestFailed': 'درخواست انجمن ناموفق بود.',
  'quest.itemFallback': 'آیتم {id}',
  'event.shortOfZen': 'Zen شما کافی نیست.',
  'notify.negativePrice': 'قیمت نمی‌تواند منفی باشد',
} satisfies Partial<Record<keyof typeof en, string>>;
