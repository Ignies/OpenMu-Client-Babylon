/** Vietnamese text of the `chat_room` window. */

import type en from './en';

export default {
  'chatRoom.title': 'Phòng chat',
  'chatRoom.connecting': 'Đang kết nối tới máy chủ chat...',
  'chatRoom.closed': 'Đã ngắt kết nối',
  'chatRoom.members': 'Thành viên ({count})',
  'chatRoom.invite': 'Mời',
  'chatRoom.inviteEmpty': 'Không có người bạn nào khác đang trực tuyến.',
  'chatRoom.inputPlaceholder': 'Nhập tin nhắn',
  'chatRoom.waiting': 'Đang chờ {name} tham gia...',
} satisfies Partial<Record<keyof typeof en, string>>;
