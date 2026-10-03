/** Vietnamese text of the `reconnect_overlay` interface widget. */

import type en from './en';

export default {
  'resume.title': 'Mất kết nối',
  'resume.connecting': 'Đang kết nối lại... (lần thử {attempt})',
  'resume.loggingIn': 'Đang đăng nhập lại...',
  'resume.selecting': 'Đang vào thế giới...',
  'resume.cancel': 'Hủy',
} satisfies Partial<Record<keyof typeof en, string>>;
