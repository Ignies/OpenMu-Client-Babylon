/** fa text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': 'بازیکن {name} انجمن را ترک کرد.',
  'guild.youLeft': 'شما انجمن را ترک کردید.',
  'guild.disbanded': 'انجمن منحل شد.',
  'guild.memberRemoved': 'عضو از انجمن بیرون شد.',
  'guild.onlyMasterRemoves': 'فقط رئیس انجمن می‌تواند اعضا را بیرون کند.',
  'guild.wrongPassword': 'رمز عبوری که وارد کردید نادرست است.',
  'guild.created': 'انجمن ساخته شد.',
  'guild.nameTaken': 'این نام انجمن پیش‌تر گرفته شده است.',
  'guild.createFailed': 'انجمن ساخته نشد.',
  'guild.joinRefused': 'رئیس انجمن درخواست شما را رد کرد.',
  'guild.joined': 'به انجمن پیوستید.',
  'guild.isFull': 'انجمن پر است.',
  'guild.masterUnavailable': 'رئیس انجمن در دسترس نیست.',
  'guild.masterBusy': 'رئیس انجمن مشغول است. بعداً دوباره بکوشید.',
  'guild.needLevel6': 'برای پیوستن به انجمن باید دست‌کم سطح 6 باشید.',
} satisfies Partial<Record<keyof typeof en, string>>;
