/** hi text of `src/modules/band`. */

import type en from './en';

export default {
  'instrument.guitar': 'गिटार',
  'instrument.flute': 'बांसुरी',
  'instrument.ocarina': 'ओकारिना',
  'instrument.harp': 'हार्प',
  'instrument.drums': 'ड्रम',
  'instrument.you': 'आप',
  'instrument.startsPlaying': '{name} ने {instrument} बजाना शुरू किया',
  'instrument.stopsPlaying': '{name} ने बजाना बंद किया',
  'instrument.joinsBand': 'खिलाड़ी {name}, {master} के बैंड में शामिल हुआ',
  'instrument.leavesBand': '{name} ने बैंड छोड़ दिया',
  'instrument.fileError': 'यह फ़ाइल ऐसी MIDI फ़ाइल नहीं है जिसे यह क्लाइंट बजा सके',
  'instrument.unavailable': 'इस सर्वर पर वाद्य यंत्र उपलब्ध नहीं हैं',
  'instrument.stopped.flood': 'आपका प्रदर्शन रोक दिया गया: एक साथ बहुत ज़्यादा नोट',
  'instrument.stopped.order': 'आपका प्रदर्शन रोक दिया गया: नोट गलत क्रम में पहुंचे',
  'instrument.stopped.gone': 'वादक जा चुका है',
  'instrument.refused.cooldown': 'आप {seconds} सेकंड बाद फिर से बजा सकते हैं',
  'instrument.refused.busy': 'आप पहले से बजा रहे हैं या किसी बैंड में हैं',
  'instrument.refused.full': 'यहां अभी बहुत ज़्यादा वादक हैं',
  'instrument.refused.range': 'वादक से बहुत दूर',
  'instrument.refused.map': 'वादक दूसरे नक्शे पर है',
  'instrument.refused.notPerforming': 'वह खिलाड़ी नहीं बजा रहा है',
  'instrument.refused.rate': 'धीरे करें',
} satisfies Partial<Record<keyof typeof en, string>>;
