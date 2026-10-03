/** Japanese text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': '自分を友達に追加することはできません。',
  'friends.alreadyOnList': '{name} はすでに友達リストにいます。',
  'friends.listFull': '友達リストが満員です。',
  'friends.requestSent': '{name} に友達申請を送りました。',
  'friends.requestFailed': '友達申請を送れませんでした。',
  'friends.added': '{name} を友達リストに追加しました。',
  'friends.cannotLetterSelf': '自分に手紙は送れません。',
  'friends.letterArrived': '{name} から手紙が届きました。',
  'friends.letterDeleteFailed': '手紙を削除できませんでした。',
  'friends.letterSent': '手紙を送りました。',
  'friends.letterTryAgain': '手紙を送れませんでした。もう一度お試しください。',
  'friends.mailboxFull': 'その受信箱は満杯です。',
  'friends.noSuchCharacter': 'その名前のキャラクターはいません。',
  'friends.letterNeedsZen': '手紙を送るための Zen が足りません。',
  'friends.letterFailed': '手紙を送れませんでした。',
} satisfies Partial<Record<keyof typeof en, string>>;
