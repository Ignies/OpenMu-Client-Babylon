/** Korean text of the `inventory` window. */

import type en from './en';

export default {
  'inventory.title': '인벤토리',
  'inventory.close': '닫기(I, V)',
  'inventory.repair': '수리(L)',
  'inventory.personalShop': '개인 상점',
  'inventory.expand': '확장 인벤토리 열기(K)',
} satisfies Partial<Record<keyof typeof en, string>>;
