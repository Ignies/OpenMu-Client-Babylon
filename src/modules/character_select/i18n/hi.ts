/** hi text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': '4 से ज़्यादा अक्षर लिखें',
  'characters.create.specialName': 'चिह्न इस्तेमाल नहीं किए जा सकते।',
  'characters.create.reservedName': 'यह नाम आरक्षित है।',
  'characters.create.failed': 'गलत किरदार नाम डाला गया या इस नाम का किरदार पहले से मौजूद है।',
} satisfies Partial<Record<keyof typeof en, string>>;
