/** zh-Hant text of `versions/shared/monsters`. */

import type en from './en';

export default {
  'item.monsterFallback': '怪物{type}',
} satisfies Partial<Record<keyof typeof en, string>>;
