/** Korean text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': '그 아이템은 버릴 수 없습니다',
  'notify.carryingTooMuchZen': '가진 젠이 너무 많습니다',
  'notify.cannotPickUp': '그건 주울 수 없습니다',
} satisfies Partial<Record<keyof typeof en, string>>;
