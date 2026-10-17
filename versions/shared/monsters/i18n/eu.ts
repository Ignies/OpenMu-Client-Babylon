/** eu text of `versions/shared/monsters`. */

import type en from './en';

export default {
  'item.monsterFallback': 'Munstroa {type}',
} satisfies Partial<Record<keyof typeof en, string>>;
