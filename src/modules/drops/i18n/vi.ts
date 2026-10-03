/** Vietnamese text of the `drops` module. */

import type en from './en';

export default {
  'notify.cannotDropItem': 'Không thể vứt vật phẩm đó',
  'notify.carryingTooMuchZen': 'Bạn đang mang quá nhiều Zen',
  'notify.cannotPickUp': 'Không thể nhặt thứ đó',
} satisfies Partial<Record<keyof typeof en, string>>;
