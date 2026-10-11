/** Vietnamese text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} đã rời bang hội.',
  'guild.youLeft': 'Bạn đã rời bang hội.',
  'guild.disbanded': 'Bang hội đã bị giải tán.',
  'guild.memberRemoved': 'Thành viên đã bị khai trừ khỏi bang hội.',
  'guild.onlyMasterRemoves': 'Chỉ bang chủ mới có thể khai trừ thành viên.',
  'guild.wrongPassword': 'Mật khẩu bạn nhập không đúng.',
  'guild.created': 'Đã lập bang hội.',
  'guild.nameTaken': 'Tên bang hội đó đã được dùng.',
  'guild.createFailed': 'Không thể lập bang hội.',
  'guild.joinRefused': 'Bang chủ đã từ chối yêu cầu của bạn.',
  'guild.joined': 'Bạn đã gia nhập bang hội.',
  'guild.isFull': 'Bang hội đã đầy.',
  'guild.masterUnavailable': 'Bang chủ hiện không có mặt.',
  'guild.masterBusy': 'Bang chủ đang bận. Hãy thử lại sau.',
  'guild.needLevel6': 'Bạn phải đạt ít nhất cấp 6 để gia nhập bang hội.',
} satisfies Partial<Record<keyof typeof en, string>>;
