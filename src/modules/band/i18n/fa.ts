/** fa text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'گیتار',
  'instrument.flute': 'فلوت',
  'instrument.ocarina': 'اوکارینا',
  'instrument.harp': 'چنگ',
  'instrument.drums': 'طبل‌ها',
  'instrument.you': 'شما',
  'instrument.startsPlaying': 'آغاز نواختن {instrument} توسط {name}',
  'instrument.stopsPlaying': 'پایان نواختن توسط {name}',
  'instrument.joinsBand': 'پیوستن {name} به گروه نوازندگان {master}',
  'instrument.leavesBand': 'خروج {name} از گروه نوازندگان',
  'instrument.fileError': 'این فایل MIDI نیست یا این کلاینت نمی‌تواند آن را بنوازد',
  'instrument.unavailable': 'سازها در این سرور در دسترس نیستند',
  'instrument.stopped.flood': 'اجرای شما متوقف شد: نت‌های هم‌زمان بیش از حد بود',
  'instrument.stopped.order': 'اجرای شما متوقف شد: نت‌ها نامرتب رسیدند',
  'instrument.stopped.gone': 'نوازنده رفته است',
  'instrument.refused.cooldown': 'تا {seconds} ثانیه دیگر می‌توانید دوباره بنوازید',
  'instrument.refused.busy': 'شما هم‌اکنون در حال اجرا یا در گروه نوازندگان هستید',
  'instrument.refused.full': 'اکنون نوازندگان این‌جا بیش از حد هستند',
  'instrument.refused.range': 'از نوازنده بیش از حد دور هستید',
  'instrument.refused.map': 'نوازنده در نقشه دیگری است',
  'instrument.refused.notPerforming': 'آن بازیکن در حال اجرا نیست',
  'instrument.refused.rate': 'آهسته‌تر',
} satisfies Partial<Record<keyof typeof en, string>>;
