/** Vietnamese text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': 'Đang tải dữ liệu trò chơi',
  'autoDownload.done': 'Đã tải xong dữ liệu trò chơi',
  'autoDownload.cancel': 'Hủy',
  'autoDownload.hide': 'Ẩn (vẫn tiếp tục tải)',
  'autoDownload.phase.map': 'Đang tải bản đồ: {name}',
  'autoDownload.phase.icons': 'Đang tải vật phẩm',
  'autoDownload.phase.audio': 'Đang tải nhạc và âm thanh',
  'autoDownload.phase.monsters': 'Đang tải nhân vật và quái vật',
  'autoDownload.phase.core': 'Đang tải giao diện và hiệu ứng',
  'autoDownload.left': 'Còn {left} MB',
  'autoDownload.received': 'Đã tải {got} MB trên {total} MB',
  'autoDownload.screenTitle': 'Đang chuẩn bị cuộc phiêu lưu',
  'autoDownload.screenText': 'Các tệp này được giữ lại để lần chơi sau tải nhanh hơn. Chỉ lần đầu tiên.',
  'autoDownload.skip': 'Vẫn vào',
  'autoDownload.skipNote': 'Việc tải vẫn tiếp tục ở chế độ nền. Nếu bạn đóng trò chơi, nó sẽ tiếp tục từ chỗ đã dừng.',
} satisfies Partial<Record<keyof typeof en, string>>;
