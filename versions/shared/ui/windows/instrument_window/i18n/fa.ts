/** fa text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'ساز',
  'instrument.load': 'بارگذاری MIDI',
  'instrument.noFile': 'فایلی بارگذاری نشده',
  'instrument.loading': 'در حال بارگذاری ساز...',
  'instrument.play': 'پخش',
  'instrument.pause': 'مکث',
  'instrument.stop': 'توقف',
  'instrument.loop': 'تکرار',
  'instrument.channels': 'کانال‌ها',
  'instrument.band': 'گروه نوازندگان',
  'instrument.join': 'پیوستن',
  'instrument.leave': 'ترک',
  'instrument.nearby': 'نوازندگان نزدیک',
  'instrument.none': 'کسی در این نزدیکی نمی‌نوازد',
} satisfies Partial<Record<keyof typeof en, string>>;
