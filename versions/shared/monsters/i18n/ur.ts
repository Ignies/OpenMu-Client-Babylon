/** ur text of `versions/shared/monsters`. */

import type en from './en';

export default {
  'item.monsterFallback': 'مونسٹر {type}',
} satisfies Partial<Record<keyof typeof en, string>>;
