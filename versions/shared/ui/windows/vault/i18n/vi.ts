/** Vietnamese text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': 'Ngọc',
  'vault.depositJewelsHint': 'Chuyển mọi viên ngọc từ hành trang vào nhà kho',
  'vault.title': 'Nhà kho',
  'vault.unlocked': 'Đã mở khóa',
  'vault.locked': 'Đã khóa',
  'vault.fee': 'Phí',
  'vault.deposit': 'Gửi Zen',
  'vault.withdraw': 'Rút Zen',
  'vault.pin': 'Mã PIN nhà kho',
} satisfies Partial<Record<keyof typeof en, string>>;
