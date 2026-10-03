/** Chinese text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': '背包',
  'inventory.close': '关闭（I、V）',
  'inventory.repair': '修理（L）',
  'inventory.personalShop': '个人商店',
  'inventory.expand': '打开扩展背包（K）',
} satisfies Partial<Record<keyof typeof en, string>>;
