/** Vietnamese text of the `skill_tooltip` interface widget. */

import type en from './en';

export default {
  'skills.tooltip.unknown': 'Kỹ năng không rõ',
  'skills.tooltip.class': 'Lớp nhân vật của bạn không thể dùng',
  'skills.tooltip.weapon': 'Cần vũ khí mang kỹ năng này',
  'skills.tooltip.cooldown': 'Chưa sẵn sàng',
  'skills.tooltip.level': 'Yêu cầu cấp {level}',
  'skills.tooltip.energy': 'Yêu cầu năng lượng {energy}',
  'skills.tooltip.mana': 'Không đủ mana ({mana})',
  'skills.tooltip.ag': 'Không đủ AG ({ag})',
  'skills.tooltip.safezone': 'Không thể dùng trong khu an toàn',
  'skills.unnamed': 'Kỹ năng #{number}',
  'skills.named': '{name} (Cấp {level})',
  'skills.damage': 'Sát thương kỹ năng +{value}',
  'skills.distance': 'Khoảng cách: {value}',
  'skills.mana': 'Mana: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': 'Sẵn sàng sau {seconds} s',
  'skills.delay': 'Độ trễ: {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
