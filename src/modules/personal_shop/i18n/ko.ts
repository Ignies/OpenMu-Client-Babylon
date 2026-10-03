/** Korean text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled': '이 서버에서는 개인 상점이 꺼져 있습니다.',
  'personalShop.slotNotInShop': '그 칸은 상점에 속하지 않습니다.',
  'personalShop.priceNotSet': '가격을 설정할 수 없습니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
