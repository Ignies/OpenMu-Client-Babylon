/** bn text of `src/modules/chaos_mix`. */

import type en from './en';

export default {
  'jewelMix.lacking': 'মিশ্রণের জন্য আইটেম যথেষ্ট নেই।',
  'jewelMix.cannotDismantle': 'এটি ভাঙা যায় না।',
} satisfies Partial<Record<keyof typeof en, string>>;
