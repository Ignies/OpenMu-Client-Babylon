/** Vietnamese text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'Lỗi kết nối WebSocket',
  'notify.connectionLost': 'Đã mất kết nối với máy chủ',
  'notify.serverListLost': 'Đã mất kết nối với danh sách máy chủ',
  'notify.helperStarted': 'MU Helper đã bật',
  'notify.helperStopped': 'MU Helper đã tắt',
  'notify.helperSafeZone': 'Không thể bật MU Helper trong vùng an toàn',
  'notify.helperCost': 'MU Helper đã tiêu tốn {total} Zen',
  'notify.zenCap': 'Bạn không thể mang quá 2.000.000.000 Zen',
  'notify.cannotSell': 'Vật phẩm này không thể bán',
  'notify.merchantRefuses': 'Thương nhân không muốn mua vật phẩm này',
  'notify.learnedSkill': 'Bạn đã học {name}',
  'notify.storageOpen': 'Không thể dùng vật phẩm khi nhà kho đang mở',
  'notify.upgradeNeedsServer': 'Nâng cấp cần kết nối máy chủ',
  'notify.noAnswerRestored': 'Máy chủ không phản hồi - đã khôi phục vật phẩm',
  'notify.cannotBuy': 'Bạn không thể mua vật phẩm này',
} satisfies Partial<Record<keyof typeof en, string>>;
