/** ar text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'أدخل اسم الحساب وكلمة المرور',
  'login.createAccount': 'إنشاء حساب',
  'login.rememberMe': 'تذكرني؟',
  'register.id': 'ID',
  'register.password': 'كلمة المرور',
  'register.confirm': 'تأكيد',
  'register.fillEveryField': 'يرجى ملء جميع الحقول.',
  'register.idTooShort': 'يجب أن يتكون ID من {min} حرف على الأقل.',
  'register.idChars': 'يمكن أن يحتوي ID على أحرف وأرقام فقط.',
  'register.passwordTooShort': 'يجب أن تتكون كلمة المرور من {min} حرف على الأقل.',
  'register.passwordChars': 'يمكن أن تحتوي كلمة المرور على أحرف وأرقام ورموز أساسية فقط.',
  'register.mismatch': 'كلمتا المرور غير متطابقتين.',
  'register.unreachable': 'تعذر الوصول إلى الخادم.',
  'register.failed': 'فشل التسجيل ({status}).',
  'register.created': 'تم إنشاء الحساب. يمكنك تسجيل الدخول الآن.',
} satisfies Partial<Record<keyof typeof en, string>>;
