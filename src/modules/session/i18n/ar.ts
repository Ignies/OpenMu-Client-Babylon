/** ar text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'أغلق نافذة Chaos قبل الخروج من اللعبة.',
  'exit.noAnswer': 'لم يستجب الخادم. سيتم الخروج على أي حال.',
  'resume.done': 'عاد الاتصال',
  'resume.failed': 'تعذرت إعادة الاتصال',
  'resume.cancelled': 'تم إلغاء إعادة الاتصال',
  'login.closingOldSession': 'الحساب ما زال متصلا: جار إغلاق الجلسة القديمة والمحاولة مجددا...',
  'login.tokenRefused': 'انتهت صلاحية تسجيل الدخول المحفوظ. أدخل كلمة المرور.',
  'login.tokenUnanswered': 'لم يستجب الخادم لتسجيل الدخول المحفوظ. أدخل كلمة المرور.',
} satisfies Partial<Record<keyof typeof en, string>>;
