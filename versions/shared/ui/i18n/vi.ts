/** Vietnamese text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'Đang tải danh sách máy chủ...',
  'servers.serverName': 'Máy chủ {number}',
  'login.id': 'ID',
  'login.password': 'Mật khẩu',
  'options.title': 'Tùy chọn',
  'options.texturePack': 'Texture mô hình',
  'options.texturePack.original': 'Gốc',
  'options.texturePackHint': 'Texture mô hình độ phân giải cao hơn, áp dụng không cần tải lại',
  'session.toLevel': 'Đến lên cấp',
  'bottomBar.pet.normalTip': 'Mặc định: quạ ở bên cạnh bạn',
  'bottomBar.pet.randomTip': 'Ngẫu nhiên: tấn công mọi thứ ở gần',
  'bottomBar.pet.ownerTip': 'Chủ nhân: tấn công thứ bạn tấn công',
  'bottomBar.pet.targetTip': 'Mục tiêu: tấn công mục tiêu hiện tại của bạn',
  'skills.title': 'Kỹ năng',
  'skills.empty': 'Chưa học kỹ năng nào',
  'chatRoom.leave': 'Rời',
  'command.trade': 'Giao dịch',
  'command.purchase': 'Mua',
  'command.party': 'Tổ đội',
  'command.whisper': 'Nói riêng',
  'command.follow': 'Đi theo',
  'command.battle': 'Chiến đấu',
  'warp.title': 'Cửa sổ dịch chuyển',
  'instrument.putAway': 'Cất đi',
  'prompt.trade': 'Giao dịch',
} satisfies Partial<Record<keyof typeof en, string>>;
