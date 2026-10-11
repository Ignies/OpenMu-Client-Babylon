/** Vietnamese text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'Hãy nhập nhiều hơn 4 ký tự',
  'characters.create.specialName': 'Không được dùng ký hiệu.',
  'characters.create.reservedName': 'Tên này đã được giữ trước.',
  'characters.create.failed': 'Tên nhân vật không hợp lệ hoặc đã tồn tại.',
} satisfies Partial<Record<keyof typeof en, string>>;
