/** Vietnamese text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Cửa hàng vật phẩm',
  'bottomBar.characterInfo': 'Thông tin nhân vật',
  'bottomBar.inventory': 'Hành trang',
  'bottomBar.friendList': 'Danh sách bạn bè',
  'bottomBar.menu': 'Menu',
  'bottomBar.noSkill': 'Không có kỹ năng (chuột phải = tấn công)',
  'bottomBar.emptySlot': '[{key}] trống',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - nhấp: danh sách kỹ năng, chuột phải: đánh thường',
  'bottomBar.pickSkill': '[{key}] trống - nhấp để chọn kỹ năng',
  'bottomBar.boundSlot': '{name} [{key}] - chuột phải để đổi',
  'bottomBar.clearSlot': 'Để trống ô [{key}]',
  'bottomBar.pet.normal': 'Thg',
  'bottomBar.pet.random': 'NgN',
  'bottomBar.pet.owner': 'Chủ',
  'bottomBar.pet.target': 'MT',
  'bottomBar.pet.needTarget': 'Hãy chọn mục tiêu cho quạ trước',
  'exp.title': 'Kinh nghiệm',
} satisfies Partial<Record<keyof typeof en, string>>;
