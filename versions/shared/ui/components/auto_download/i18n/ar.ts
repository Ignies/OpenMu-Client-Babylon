/** ar text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'جار تنزيل بيانات اللعبة',
  'autoDownload.done': 'تم تنزيل بيانات اللعبة',
  'autoDownload.cancel': 'إلغاء',
  'autoDownload.hide': 'إخفاء (يستمر التنزيل)',
  'autoDownload.phase.map': 'جار تحميل الخريطة: {name}',
  'autoDownload.phase.icons': 'جار تحميل العناصر',
  'autoDownload.phase.audio': 'جار تحميل الموسيقى والأصوات',
  'autoDownload.phase.monsters': 'جار تحميل الشخصيات والمخلوقات',
  'autoDownload.phase.core': 'جار تحميل الواجهة والمؤثرات',
  'autoDownload.left': 'متبقٍ {left} ميغابايت',
  'autoDownload.received': 'تم تنزيل {got} ميغابايت من {total} ميغابايت',
  'autoDownload.screenTitle': 'جار تجهيز مغامرتك',
  'autoDownload.screenText': 'تُحفظ هذه الملفات لتُحمَّل لعبتك التالية أسرع. في المرة الأولى فقط.',
  'autoDownload.skip': 'الدخول على أي حال',
  'autoDownload.skipNote': 'يستمر التنزيل في الخلفية. إذا أغلقت اللعبة، فسيُستأنف من حيث توقف.',
} satisfies Partial<Record<keyof typeof en, string>>;
