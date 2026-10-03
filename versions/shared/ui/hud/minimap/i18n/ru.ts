/** Russian text of the `minimap` HUD element. */

import type en from './en';

export default {
  'minimap.close': 'Закрыть',
  'minimap.center': 'Центрировать',
} satisfies Partial<Record<keyof typeof en, string>>;
