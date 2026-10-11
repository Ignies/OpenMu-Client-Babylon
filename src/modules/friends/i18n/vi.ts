/** Vietnamese text of the `friends` module. */

import type en from './en';

export default {
  'friends.cannotAddSelf': 'Bạn không thể tự thêm mình làm bạn.',
  'friends.alreadyOnList': '{name} đã có trong danh sách bạn bè.',
  'friends.listFull': 'Danh sách bạn bè đã đầy.',
  'friends.requestSent': 'Đã gửi lời mời kết bạn tới {name}.',
  'friends.requestFailed': 'Không thể gửi lời mời kết bạn.',
  'friends.added': 'Đã thêm {name} vào danh sách bạn bè.',
  'friends.cannotLetterSelf': 'Bạn không thể gửi thư cho chính mình.',
  'friends.letterArrived': 'Có thư mới từ {name}.',
  'friends.letterDeleteFailed': 'Không thể xóa thư.',
  'friends.letterSent': 'Đã gửi thư.',
  'friends.letterTryAgain': 'Không thể gửi thư. Hãy thử lại.',
  'friends.mailboxFull': 'Hộp thư đó đã đầy.',
  'friends.noSuchCharacter': 'Không có nhân vật nào mang tên đó.',
  'friends.letterNeedsZen': 'Bạn không đủ Zen để gửi thư.',
  'friends.letterFailed': 'Không thể gửi thư.',
} satisfies Partial<Record<keyof typeof en, string>>;
