/** Vietnamese text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Hãy đóng cửa sổ Chaos rồi mới thoát game.',
  'exit.noAnswer': 'Máy chủ không phản hồi. Vẫn thoát.',
  'resume.done': 'Đã trực tuyến lại',
  'resume.failed': 'Không thể kết nối lại',
  'resume.cancelled': 'Đã hủy kết nối lại',
} satisfies Partial<Record<keyof typeof en, string>>;
