/** Vietnamese text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'Tìm...',
  'search.hint': 'Gõ để làm mờ mọi thứ không khớp. Esc để xóa.',
} satisfies Partial<Record<keyof typeof en, string>>;
