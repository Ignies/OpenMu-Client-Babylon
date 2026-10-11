/** Korean text of `versions/shared/monsters`. */

import type en from './en';

export default {
  'item.monsterFallback': '몬스터 {type}',
} satisfies Partial<Record<keyof typeof en, string>>;
