/** Vietnamese text of the `inventory` module. */

import type en from './en';

export default {
  'item.takeItemOffFirst': 'Hãy tháo vật phẩm ra trước khi nâng cấp',
  'item.jewelNotAJewel': 'Vật phẩm đó không thể dùng lên vật phẩm khác',
  'item.jewelNotUpgradable': 'Vật phẩm đó không thể nâng cấp',
  'item.jewelBlessLimit': 'Jewel of Bless chỉ dùng được tới +6',
  'item.jewelSoulLimit': 'Jewel of Soul chỉ dùng được tới +9',
  'item.jewelHarmonyAncient': 'Không thể dùng Jewel of Harmony cho đồ Ancient',
  'item.jewelHarmonySocket': 'Không thể dùng Jewel of Harmony cho đồ Socket',
  'item.refineStoneSocket': 'Không thể dùng đá tinh luyện cho đồ Socket',
  'item.jewelWrongTarget': 'Vật phẩm đó không thể dùng lên vật phẩm khác',
  'notify.cannotStore': 'Vật phẩm này không thể cất giữ',
  'notify.cannotTrade': 'Vật phẩm này không thể giao dịch',
  'notify.noInventoryRoom': 'Hành trang đã hết chỗ',
  'notify.noRoomForItem': 'Không còn chỗ cho vật phẩm đó',
  'notify.inventorySorted': 'Đã sắp xếp hành trang',
  'notify.itemsMoved': 'Đã chuyển {count} vật phẩm',
  'notify.itemsBought': 'Đã mua {count}',
  'notify.cannotMoveItem': 'Không thể đặt vật phẩm vào đó',
  'notify.cannotUseItem': 'Không thể dùng vật phẩm theo cách đó',
} satisfies Partial<Record<keyof typeof en, string>>;
