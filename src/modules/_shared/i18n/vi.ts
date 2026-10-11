/** Vietnamese text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': 'Cửa hàng cá nhân cần nhân vật cấp 6.',
  'personalShop.openFailed': 'Không thể mở cửa hàng.',
  'personalShop.cannotSell': 'Vật phẩm này không thể bán trong cửa hàng.',
  'personalShop.itemGone': 'Vật phẩm đó không còn nữa.',
  'guild.alreadyInGuild': 'Bạn đã thuộc một bang hội.',
  'guild.notGuildMaster': 'Người chơi đó không phải bang chủ.',
  'guild.requestFailed': 'Yêu cầu bang hội thất bại.',
  'quest.itemFallback': 'Vật phẩm {id}',
  'event.shortOfZen': 'Bạn không đủ Zen.',
  'notify.negativePrice': 'Giá không thể là số âm',
} satisfies Partial<Record<keyof typeof en, string>>;
