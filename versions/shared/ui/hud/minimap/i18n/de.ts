/** German text of the `minimap` HUD element. */

import type en from './en';

export default {
  'minimap.close': 'Schließen',
  'minimap.center': 'Zentrieren',
} satisfies Partial<Record<keyof typeof en, string>>;
