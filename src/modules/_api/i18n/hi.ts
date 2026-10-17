/** hi text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped':
    'यह दुनिया एक ऐसा मॉड्यूल बताती है जो पढ़ा नहीं जा सकता ({id}): छोड़ा गया',
  'moduleStream.api':
    'मॉड्यूल {id} को मॉड्यूल API {range} चाहिए, यह क्लाइंट {have} देता है: छोड़ा गया',
  'moduleStream.download': 'मॉड्यूल {id} डाउनलोड नहीं हो सका: छोड़ा गया',
  'moduleStream.hash': 'मॉड्यूल {id} अपने हैश से मेल नहीं खाता: छोड़ा गया',
  'moduleStream.core': 'मॉड्यूल {id} खुद को कोर मॉड्यूल बताता है: ठुकराया गया',
  'moduleStream.builtIn': 'मॉड्यूल {id} का नाम एक बिल्ट-इन मॉड्यूल जैसा है: ठुकराया गया',
  'moduleStream.declined': 'मॉड्यूल {id} की अनुमति नहीं मिली: छोड़ा गया',
  'moduleStream.failed': 'मॉड्यूल {id} शुरू नहीं हो सका: हटाया गया',
} satisfies Partial<Record<keyof typeof en, string>>;
