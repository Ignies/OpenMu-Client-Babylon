/** Chinese text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': '你不能把自己加为好友。',
  'friends.alreadyOnList': '{name} 已在你的好友列表中。',
  'friends.listFull': '你的好友列表已满。',
  'friends.requestSent': '已向 {name} 发送好友请求。',
  'friends.requestFailed': '好友请求发送失败。',
  'friends.added': '{name} 已加入你的好友列表。',
  'friends.cannotLetterSelf': '你不能给自己写信。',
  'friends.letterArrived': '收到来自 {name} 的信件。',
  'friends.letterDeleteFailed': '信件删除失败。',
  'friends.letterSent': '信件已发送。',
  'friends.letterTryAgain': '信件发送失败，请再试一次。',
  'friends.mailboxFull': '对方的信箱已满。',
  'friends.noSuchCharacter': '没有叫这个名字的角色。',
  'friends.letterNeedsZen': '你的金币不足以寄信。',
  'friends.letterFailed': '信件发送失败。',
} satisfies Partial<Record<keyof typeof en, string>>;
