/** Vietnamese text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'Ghi công',
  'projectCredits.thanks': 'Đặc biệt cảm ơn',
  'projectCredits.thanksNote': 'Các dự án và những người mà client này dựa trên.',
  'projectCredits.contributors': 'Người đóng góp',
  'projectCredits.playtesters': 'Chơi thử',
  'projectCredits.reporters': 'Báo lỗi',
  'projectCredits.everyoneHeading': 'Và',
  'projectCredits.everyone': 'Tất cả những ai đã đóng góp',
  'projectCredits.commits': '{count} commit',
  'projectCredits.reports': '{count} báo cáo',
  'projectCredits.owners': 'MU Online, client gốc và dữ liệu game: Webzen.',
  'projectCredits.season6': 'Danh sách ghi công gốc của Season 6 là nút Credit trong danh sách máy chủ.',
  'projectCredits.loading': 'Đang đọc danh sách...',
} satisfies Partial<Record<keyof typeof en, string>>;
