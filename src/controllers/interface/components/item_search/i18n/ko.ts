/** Korean text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': '찾기...',
  'search.hint': '입력하면 일치하지 않는 것이 흐려집니다. Esc로 지웁니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
