/** el text of `versions/shared/monsters`. */

import type en from './en';

export default {
  'item.monsterFallback': 'Τέρας {type}',
} satisfies Partial<Record<keyof typeof en, string>>;
