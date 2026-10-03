/** Japanese text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': '検索...',
  'search.hint': '入力すると一致しないものが薄くなります。Esc で消去。',
} satisfies Partial<Record<keyof typeof en, string>>;
