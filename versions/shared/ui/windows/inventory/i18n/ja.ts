/** Japanese text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': 'インベントリ',
  'inventory.close': '閉じる（I、V）',
  'inventory.repair': '修理（L）',
  'inventory.personalShop': '個人商店',
  'inventory.expand': '拡張インベントリを開く（K）',
} satisfies Partial<Record<keyof typeof en, string>>;
