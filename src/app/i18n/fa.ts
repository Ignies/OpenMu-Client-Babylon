/** fa text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'خطای اتصال WebSocket',
  'notify.connectionLost': 'اتصال به سرور قطع شد',
  'notify.serverListLost': 'اتصال به فهرست سرورها قطع شد',
  'notify.helperStarted': 'MU Helper روشن شد',
  'notify.helperStopped': 'MU Helper خاموش شد',
  'notify.helperSafeZone': 'MU Helper در منطقه امن روشن نمی‌شود',
  'notify.helperCost': 'هزینه MU Helper تاکنون: {total} Zen',
  'notify.zenCap': 'نمی‌توانید بیش از 2,000,000,000 Zen همراه داشته باشید',
  'notify.cannotSell': 'این آیتم فروختنی نیست',
  'notify.merchantRefuses': 'بازرگان این آیتم را نمی‌خواهد',
  'notify.learnedSkill': 'مهارت {name} را آموختید',
  'notify.storageOpen': 'تا انبار باز است نمی‌توانید از آیتم‌ها استفاده کنید',
  'notify.upgradeNeedsServer': 'ارتقا به سرور نیاز دارد',
  'notify.noAnswerRestored': 'سرور پاسخ نداد - آیتم بازگردانده شد',
  'notify.cannotBuy': 'نمی‌توانید این آیتم را بخرید',
  'notify.updateAvailable':
    'نسخه تازه‌ای آمده است: با بازگشت به فهرست سرورها، صفحه دوباره بارگذاری می‌شود.',
} satisfies Partial<Record<keyof typeof en, string>>;
