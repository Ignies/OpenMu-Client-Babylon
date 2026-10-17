/** fil text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'May module ang mundong ito na hindi mabasa ({id}): nilaktawan',
  'moduleStream.api':
    'Kailangan ng module na {id} ang module API {range}, {have} ang ibinibigay ng client na ito: nilaktawan',
  'moduleStream.download': 'Hindi ma-download ang module na {id}: nilaktawan',
  'moduleStream.hash': 'Hindi tugma ang module na {id} sa hash nito: nilaktawan',
  'moduleStream.core': 'Nagpapanggap na core module ang module na {id}: tinanggihan',
  'moduleStream.builtIn': 'Kapangalan ng built-in na module ang module na {id}: tinanggihan',
  'moduleStream.declined': 'Hindi pinayagan ang module na {id}: nilaktawan',
  'moduleStream.failed': 'Hindi nagsimula ang module na {id}: inalis',
} satisfies Partial<Record<keyof typeof en, string>>;
