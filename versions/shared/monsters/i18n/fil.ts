/** fil text of `versions/shared/monsters`. */

import type en from './en';

export default {
  'item.monsterFallback': 'Halimaw {type}',
} satisfies Partial<Record<keyof typeof en, string>>;
