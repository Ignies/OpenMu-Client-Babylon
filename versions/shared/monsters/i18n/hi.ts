/** hi text of `versions/shared/monsters`. */

import type en from './en';

export default {
  'item.monsterFallback': 'मॉन्स्टर {type}',
} satisfies Partial<Record<keyof typeof en, string>>;
