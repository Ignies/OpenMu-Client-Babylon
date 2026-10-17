/** ar text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'خطأ في اتصال WebSocket',
  'notify.connectionLost': 'انقطع الاتصال بالخادم',
  'notify.serverListLost': 'انقطع الاتصال بقائمة الخوادم',
  'notify.helperStarted': 'بدأ تشغيل MU Helper',
  'notify.helperStopped': 'توقف MU Helper',
  'notify.helperSafeZone': 'لا يمكن تشغيل MU Helper في المنطقة الآمنة',
  'notify.helperCost': 'استهلك MU Helper مبلغ {total} Zen',
  'notify.zenCap': 'لا يمكنك حمل أكثر من 2,000,000,000 Zen',
  'notify.cannotSell': 'لا يمكن بيع هذا الغرض',
  'notify.merchantRefuses': 'التاجر لا يريد هذا الغرض',
  'notify.learnedSkill': 'لقد تعلمت المهارة {name}',
  'notify.storageOpen': 'لا يمكنك استخدام الأغراض والخزنة مفتوحة',
  'notify.upgradeNeedsServer': 'يحتاج التطوير إلى خادم',
  'notify.noAnswerRestored': 'لم يستجب الخادم - تمت استعادة الغرض',
  'notify.cannotBuy': 'لا يمكنك شراء هذا الغرض',
  'notify.updateAvailable': 'صدر إصدار جديد: ستعاد تحميل الصفحة عند عودتك إلى قائمة الخوادم.',
} satisfies Partial<Record<keyof typeof en, string>>;
