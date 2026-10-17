/** ur text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'اپنا اکاؤنٹ نام اور پاس ورڈ درج کریں',
  'login.createAccount': 'اکاؤنٹ بنائیں',
  'login.rememberMe': 'مجھے یاد رکھیں؟',
  'register.id': 'ID',
  'register.password': 'پاس ورڈ',
  'register.confirm': 'تصدیق',
  'register.fillEveryField': 'براہ کرم ہر خانہ پُر کریں۔',
  'register.idTooShort': 'ID کم از کم {min} حروف کی ہونی چاہیے۔',
  'register.idChars': 'ID میں صرف حروف اور اعداد ہو سکتے ہیں۔',
  'register.passwordTooShort': 'پاس ورڈ کم از کم {min} حروف کا ہونا چاہیے۔',
  'register.passwordChars': 'پاس ورڈ میں صرف حروف، اعداد اور بنیادی علامات ہو سکتی ہیں۔',
  'register.mismatch': 'پاس ورڈ میل نہیں کھاتے۔',
  'register.unreachable': 'سرور تک رسائی نہ ہو سکی۔',
  'register.failed': 'رجسٹریشن ناکام ({status})۔',
  'register.created': 'اکاؤنٹ بن گیا۔ اب آپ لاگ ان کر سکتے ہیں۔',
  'login.savedLogin': 'محفوظ لاگ ان',
} satisfies Partial<Record<keyof typeof en, string>>;
