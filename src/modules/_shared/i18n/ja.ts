/** Japanese text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': '個人商店にはレベル 6 が必要です。',
  'personalShop.openFailed': '商店を開けませんでした。',
  'personalShop.cannotSell': 'このアイテムは商店で売れません。',
  'personalShop.itemGone': 'そのアイテムはもうありません。',
  'guild.alreadyInGuild': 'すでにギルドに所属しています。',
  'guild.notGuildMaster': 'そのプレイヤーはギルドマスターではありません。',
  'guild.requestFailed': 'ギルドの申請に失敗しました。',
  'quest.itemFallback': 'アイテム {id}',
  'event.shortOfZen': 'Zen が足りません。',
  'notify.negativePrice': '価格を負の値にはできません',
} satisfies Partial<Record<keyof typeof en, string>>;
