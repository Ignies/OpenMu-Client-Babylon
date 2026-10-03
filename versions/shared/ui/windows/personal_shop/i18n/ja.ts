/** Japanese text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': '個人商店',
  'personalShop.button': '商店',
  'personalShop.selling': 'あなたの商店は営業中です',
  'personalShop.namePlaceholder': '店名',
  'personalShop.openTip': '商店を開く',
  'personalShop.closeTip': '商店を閉じる',
  'personalShop.info1': '開店前にすべてのアイテムへ値段を付けてください。',
  'personalShop.info2': '移動したりログアウトすると商店は閉じます。',
  'personalShop.info3': '購入者はあなたの隣に立つ必要があります。',
  'personalShop.info4': '値段の付いたアイテムは使用も破棄もできません。',
  'personalShop.info5': 'Zen は直接インベントリに入ります。',
  'personalShop.warn1': '価値より安く売らないでください。',
  'personalShop.warn2': '価格の最終判断はサーバーが行います。',
} satisfies Partial<Record<keyof typeof en, string>>;
