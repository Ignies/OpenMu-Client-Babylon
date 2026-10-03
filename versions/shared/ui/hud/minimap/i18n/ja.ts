/** Japanese text of the `minimap` HUD element. */

import type en from './en';

export default {
  'minimap.close': '閉じる',
  'minimap.center': '中央に戻す',
} satisfies Partial<Record<keyof typeof en, string>>;
