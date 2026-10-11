/** Chinese text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': '查找...',
  'search.hint': '输入以淡化不匹配的物品，Esc 清除。',
} satisfies Partial<Record<keyof typeof en, string>>;
