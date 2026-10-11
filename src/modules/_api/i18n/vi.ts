/** Vietnamese text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'Thế giới này liệt kê một mô-đun không đọc được ({id}): bỏ qua',
  'moduleStream.api': 'Mô-đun {id} cần API mô-đun {range}, máy khách này hỗ trợ {have}: bỏ qua',
  'moduleStream.download': 'Không tải được mô-đun {id}: bỏ qua',
  'moduleStream.hash': 'Mô-đun {id} không khớp với mã băm: bỏ qua',
  'moduleStream.core': 'Mô-đun {id} tự nhận là mô-đun lõi: từ chối',
  'moduleStream.builtIn': 'Mô-đun {id} trùng tên với một mô-đun có sẵn: từ chối',
  'moduleStream.declined': 'Mô-đun {id} không được cho phép: bỏ qua',
  'moduleStream.failed': 'Mô-đun {id} không khởi động được: đã gỡ',
} satisfies Partial<Record<keyof typeof en, string>>;
