/** ar text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'الآلة الموسيقية',
  'instrument.load': 'تحميل MIDI',
  'instrument.noFile': 'لم يتم تحميل أي ملف',
  'instrument.loading': 'جار تحميل الآلة...',
  'instrument.play': 'تشغيل',
  'instrument.pause': 'إيقاف مؤقت',
  'instrument.stop': 'إيقاف',
  'instrument.loop': 'تكرار',
  'instrument.channels': 'القنوات',
  'instrument.band': 'الفرقة',
  'instrument.join': 'انضمام',
  'instrument.leave': 'مغادرة',
  'instrument.nearby': 'عازفون قريبون',
  'instrument.none': 'لا أحد يعزف بالقرب منك',
} satisfies Partial<Record<keyof typeof en, string>>;
