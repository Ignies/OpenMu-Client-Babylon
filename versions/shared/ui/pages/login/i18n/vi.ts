/** Vietnamese text of the `login` page. */

import type en from './en';

export default {
  'login.enterCredentials': 'Nhập tên tài khoản và mật khẩu',
  'login.createAccount': 'Tạo tài khoản',
  'login.rememberMe': 'Ghi nhớ?',
  'register.id': 'ID',
  'register.password': 'Mật khẩu',
  'register.confirm': 'Xác nhận',
  'register.fillEveryField': 'Vui lòng điền đầy đủ các ô.',
  'register.idTooShort': 'ID phải có ít nhất {min} ký tự.',
  'register.idChars': 'ID chỉ được chứa chữ cái và chữ số.',
  'register.passwordTooShort': 'Mật khẩu phải có ít nhất {min} ký tự.',
  'register.passwordChars': 'Mật khẩu chỉ được chứa chữ cái, chữ số và các ký hiệu cơ bản.',
  'register.mismatch': 'Mật khẩu không khớp.',
  'register.unreachable': 'Không thể kết nối tới máy chủ.',
  'register.failed': 'Đăng ký thất bại ({status}).',
  'register.created': 'Đã tạo tài khoản. Bạn có thể đăng nhập ngay.',
} satisfies Partial<Record<keyof typeof en, string>>;
