/** ur text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Chaos ونڈو بند کرنے کے بعد گیم سے نکلیں۔',
  'exit.noAnswer': 'سرور نے جواب نہیں دیا۔ پھر بھی نکل رہے ہیں۔',
  'resume.done': 'دوبارہ آن لائن',
  'resume.failed': 'دوبارہ کنکشن نہ ہو سکا',
  'resume.cancelled': 'دوبارہ کنکشن منسوخ',
  'login.closingOldSession':
    'اکاؤنٹ اب بھی منسلک ہے: پرانا سیشن بند کر کے دوبارہ کوشش ہو رہی ہے...',
  'login.tokenRefused': 'آپ کا محفوظ لاگ ان ختم ہو گیا۔ اپنا پاس ورڈ درج کریں۔',
  'login.tokenUnanswered': 'سرور نے محفوظ لاگ ان کا جواب نہیں دیا۔ اپنا پاس ورڈ درج کریں۔',
} satisfies Partial<Record<keyof typeof en, string>>;
