/** zh-Hant text of `src/modules/friends`. */

import type en from './en';

export default {
  'friends.cannotAddSelf': '你不能將自己加為好友。',
  'friends.alreadyOnList': '玩家{name}已在你的好友名單中。',
  'friends.listFull': '你的好友名單已滿。',
  'friends.requestSent': '已向玩家{name}發出好友邀請。',
  'friends.requestFailed': '無法發出好友邀請。',
  'friends.added': '玩家{name}已加入你的好友名單。',
  'friends.cannotLetterSelf': '你不能寄信給自己。',
  'friends.letterArrived': '收到玩家{name}的來信。',
  'friends.letterDeleteFailed': '無法刪除信件。',
  'friends.letterSent': '信件已寄出。',
  'friends.letterTryAgain': '信件無法寄出，請再試一次。',
  'friends.mailboxFull': '對方的信箱已滿。',
  'friends.noSuchCharacter': '沒有這個名稱的角色。',
  'friends.letterNeedsZen': '你的金幣不足以寄信。',
  'friends.letterFailed': '信件無法寄出。',
} satisfies Partial<Record<keyof typeof en, string>>;
