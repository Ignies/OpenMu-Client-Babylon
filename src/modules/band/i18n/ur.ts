/** ur text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'گٹار',
  'instrument.flute': 'بانسری',
  'instrument.ocarina': 'اوکارینا',
  'instrument.harp': 'بربط',
  'instrument.drums': 'ڈھول',
  'instrument.you': 'آپ',
  'instrument.startsPlaying': '{name} نے {instrument} بجانا شروع کیا',
  'instrument.stopsPlaying': '{name} نے بجانا بند کر دیا',
  'instrument.joinsBand': '{name} نے {master} کے بینڈ میں شمولیت اختیار کی',
  'instrument.leavesBand': '{name} نے بینڈ چھوڑ دیا',
  'instrument.fileError': 'یہ ایسی MIDI فائل نہیں جو یہ کلائنٹ چلا سکے',
  'instrument.unavailable': 'اس سرور پر ساز دستیاب نہیں',
  'instrument.stopped.flood': 'آپ کی پرفارمنس روک دی گئی: ایک ساتھ بہت زیادہ سُر',
  'instrument.stopped.order': 'آپ کی پرفارمنس روک دی گئی: سُر بے ترتیب پہنچے',
  'instrument.stopped.gone': 'فنکار چلا گیا',
  'instrument.refused.cooldown': 'آپ {seconds} سیکنڈ بعد دوبارہ بجا سکتے ہیں',
  'instrument.refused.busy': 'آپ پہلے ہی بجا رہے ہیں یا کسی بینڈ میں ہیں',
  'instrument.refused.full': 'اس وقت یہاں بہت زیادہ فنکار ہیں',
  'instrument.refused.range': 'فنکار سے بہت دور',
  'instrument.refused.map': 'فنکار کسی اور نقشے پر ہے',
  'instrument.refused.notPerforming': 'یہ کھلاڑی نہیں بجا رہا',
  'instrument.refused.rate': 'ذرا آہستہ',
} satisfies Partial<Record<keyof typeof en, string>>;
