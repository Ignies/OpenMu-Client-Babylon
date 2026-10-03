/** Vietnamese text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'Linh thú',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': 'Chưa trang bị {pet}.',
  'petInfo.waiting': 'Đang chờ thông tin linh thú...',
  'petInfo.level': 'Cấp {level}',
  'petInfo.life': 'Sinh lực {current} / {max}',
  'petInfo.exp': 'Exp {current} / {next}',
  'petInfo.damage': 'Sát thương {min}~{max} (Tỉ lệ {rate})',
  'petInfo.attackSpeed': 'Tốc độ tấn công {speed}',
  'petInfo.defense': 'Phòng thủ {defense}',
  'petInfo.command': 'Lệnh',
  'petInfo.cmdNormal': 'Tấn công thường',
  'petInfo.cmdRandom': 'Tấn công ngẫu nhiên',
  'petInfo.cmdOwner': 'Tấn công cùng chủ',
  'petInfo.cmdTarget': 'Tấn công mục tiêu',
  'petInfo.close': 'Đóng',
} satisfies Partial<Record<keyof typeof en, string>>;
