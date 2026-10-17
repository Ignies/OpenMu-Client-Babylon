/** hi text of `versions/shared/ui/windows/instrument_window`. */

import type en from './en';

export default {
  'instrument.title': 'वाद्य यंत्र',
  'instrument.load': 'MIDI लोड करें',
  'instrument.noFile': 'कोई फ़ाइल लोड नहीं',
  'instrument.loading': 'वाद्य यंत्र लोड हो रहा है...',
  'instrument.play': 'बजाएं',
  'instrument.pause': 'विराम',
  'instrument.stop': 'बंद करें',
  'instrument.loop': 'दोहराएं',
  'instrument.channels': 'चैनल',
  'instrument.band': 'बैंड',
  'instrument.join': 'शामिल हों',
  'instrument.leave': 'छोड़ें',
  'instrument.nearby': 'पास के वादक',
  'instrument.none': 'पास में कोई नहीं बजा रहा',
} satisfies Partial<Record<keyof typeof en, string>>;
