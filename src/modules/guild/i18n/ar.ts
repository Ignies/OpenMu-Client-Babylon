/** ar text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': 'غادر اللاعب {name} النقابة.',
  'guild.youLeft': 'غادرت النقابة.',
  'guild.disbanded': 'تم حل النقابة.',
  'guild.memberRemoved': 'تم طرد العضو من النقابة.',
  'guild.onlyMasterRemoves': 'سيد النقابة وحده يستطيع طرد الأعضاء.',
  'guild.wrongPassword': 'كلمة المرور التي أدخلتها غير صحيحة.',
  'guild.created': 'تم إنشاء النقابة.',
  'guild.nameTaken': 'اسم النقابة هذا مستخدم بالفعل.',
  'guild.createFailed': 'تعذر إنشاء النقابة.',
  'guild.joinRefused': 'رفض سيد النقابة طلبك.',
  'guild.joined': 'انضممت إلى النقابة.',
  'guild.isFull': 'النقابة ممتلئة.',
  'guild.masterUnavailable': 'سيد النقابة غير متاح.',
  'guild.masterBusy': 'سيد النقابة مشغول. حاول لاحقا.',
  'guild.needLevel6': 'يجب أن تكون في المستوى 6 على الأقل للانضمام إلى نقابة.',
} satisfies Partial<Record<keyof typeof en, string>>;
