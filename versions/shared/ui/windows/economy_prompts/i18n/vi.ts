/** Vietnamese text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Gửi Zen',
  'prompt.takeZen': 'Rút Zen',
  'prompt.unlockVault': 'Mở khóa nhà kho',
  'prompt.enterPin': 'Nhập mã PIN nhà kho.',
  'prompt.setPin': 'Đặt mã PIN nhà kho',
  'prompt.removePin': 'Gỡ mã PIN nhà kho',
  'prompt.removePinHint': 'Cần mật khẩu tài khoản để gỡ mã PIN.',
  'prompt.offerZen': 'Đưa Zen',
  'prompt.setPrice': 'Đặt giá',
  'prompt.askingPrice': 'Giá bán.',
  'prompt.askingPriceFor': 'Giá bán cho {name}.',
  'prompt.buy': 'Mua',
  'prompt.itemCosts': '{name} có giá {price}.',
  'prompt.thisItem': 'Vật phẩm này',
  'prompt.itemGone': 'Vật phẩm này không còn nữa.',
  'prompt.buyHowMany': 'Mua bao nhiêu {name}? {price} mỗi cái.',
  'prompt.quantity': 'Số lượng',
  'prompt.carrying': 'Bạn đang mang {amount}.',
  'prompt.vaultHolds': 'Nhà kho đang chứa {amount}.',
  'prompt.newPinHint': 'Cần mật khẩu tài khoản để đặt mã PIN mới.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Mật khẩu',
  'prompt.wantsToTrade': '{name} muốn giao dịch với bạn.',
  'prompt.bundle': 'Gộp',
  'prompt.bundleAsk': 'Bạn muốn gộp {count} {name}?',
  'prompt.unbundle': 'Tách',
  'prompt.unbundleAsk': 'Bạn muốn tách gói {count} {name}?',
} satisfies Partial<Record<keyof typeof en, string>>;
