/** hi text of `src/modules/chaos_mix`. */

import type en from './en';

export default {
  'jewelMix.lacking': 'मिश्रण के लिए आइटम कम हैं।',
  'jewelMix.cannotDismantle': 'इसे तोड़ा नहीं जा सकता।',
} satisfies Partial<Record<keyof typeof en, string>>;
