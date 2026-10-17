/** ar text of `src/controllers/interface/components/item_search`. */

import type en from './en';

export default {
  'search.placeholder': 'بحث...',
  'search.hint': 'اكتب لتعتيم كل ما لا يطابق. Esc للمسح.',
} satisfies Partial<Record<keyof typeof en, string>>;
