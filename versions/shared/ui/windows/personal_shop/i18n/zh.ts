/** Chinese text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': '个人商店',
  'personalShop.button': '商店',
  'personalShop.selling': '你的商店已开张',
  'personalShop.namePlaceholder': '商店名称',
  'personalShop.openTip': '开张',
  'personalShop.closeTip': '收摊',
  'personalShop.info1': '开张前请为每件物品标价。',
  'personalShop.info2': '移动或下线时商店会关闭。',
  'personalShop.info3': '买家必须站在你身边。',
  'personalShop.info4': '标价的物品不能使用或丢弃。',
  'personalShop.info5': '金币会直接进入你的背包。',
  'personalShop.warn1': '不要低于物品价值出售。',
  'personalShop.warn2': '价格以服务器判定为准。',
} satisfies Partial<Record<keyof typeof en, string>>;
