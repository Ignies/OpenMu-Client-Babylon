/** Vietnamese text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': 'OK',
  'common.cancel': 'Hủy',
  'common.close': 'Đóng',
  'common.none': 'Không có',
  'common.create': 'Tạo',
  'common.creating': 'Đang tạo...',
  'common.send': 'Gửi',
  'common.sending': 'Đang gửi...',
  'common.loading': 'Đang tải...',
  'common.warning': 'Cảnh báo',
  'common.level': 'Cấp độ',
  'common.offline': 'Ngoại tuyến',
  'common.off': 'Tắt',
  'common.zen': 'Zen',
  'common.notEnoughZen': 'Không đủ Zen',
  'options.quality.classic': 'Cổ điển',
  'options.quality.enhanced': 'Nâng cao',
} satisfies Partial<Record<keyof typeof en, string>>;
