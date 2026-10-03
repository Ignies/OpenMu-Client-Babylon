/** Korean text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': '자신을 친구로 추가할 수 없습니다.',
  'friends.alreadyOnList': '{name}님은 이미 친구 목록에 있습니다.',
  'friends.listFull': '친구 목록이 가득 찼습니다.',
  'friends.requestSent': '{name}님에게 친구 신청을 보냈습니다.',
  'friends.requestFailed': '친구 신청을 보내지 못했습니다.',
  'friends.added': '{name}님이 친구 목록에 추가되었습니다.',
  'friends.cannotLetterSelf': '자신에게 편지를 보낼 수 없습니다.',
  'friends.letterArrived': '{name}님에게서 편지가 왔습니다.',
  'friends.letterDeleteFailed': '편지를 지우지 못했습니다.',
  'friends.letterSent': '편지를 보냈습니다.',
  'friends.letterTryAgain': '편지를 보내지 못했습니다. 다시 시도하세요.',
  'friends.mailboxFull': '그 우편함이 가득 찼습니다.',
  'friends.noSuchCharacter': '그런 이름의 캐릭터가 없습니다.',
  'friends.letterNeedsZen': '편지를 보낼 젠이 부족합니다.',
  'friends.letterFailed': '편지를 보내지 못했습니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
