/** ar text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'يذكر هذا العالم وحدة لا يمكن قراءتها ({id}): تم تخطيها',
  'moduleStream.api':
    'الوحدة {id} تحتاج إلى واجهة الوحدات {range}، وهذا العميل يوفر {have}: تم تخطيها',
  'moduleStream.download': 'تعذر تنزيل الوحدة {id}: تم تخطيها',
  'moduleStream.hash': 'الوحدة {id} لا تطابق بصمتها: تم تخطيها',
  'moduleStream.core': 'الوحدة {id} تدعي أنها وحدة أساسية: تم رفضها',
  'moduleStream.builtIn': 'الوحدة {id} تحمل اسم وحدة مدمجة: تم رفضها',
  'moduleStream.declined': 'لم يسمح بالوحدة {id}: تم تخطيها',
  'moduleStream.failed': 'فشل تشغيل الوحدة {id}: تم إلغاء تحميلها',
} satisfies Partial<Record<keyof typeof en, string>>;
