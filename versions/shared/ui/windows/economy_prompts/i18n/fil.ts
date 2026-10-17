/** fil text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Itabi ang Zen',
  'prompt.takeZen': 'Kunin ang Zen',
  'prompt.unlockVault': 'Buksan ang kandado ng bodega',
  'prompt.enterPin': 'Ilagay ang PIN ng bodega.',
  'prompt.setPin': 'Magtakda ng PIN ng bodega',
  'prompt.removePin': 'Alisin ang PIN ng bodega',
  'prompt.removePinHint': 'Kailangan ang password ng iyong account para alisin ang PIN.',
  'prompt.offerZen': 'Mag-alok ng Zen',
  'prompt.setPrice': 'Magtakda ng presyo',
  'prompt.askingPrice': 'Hinihinging presyo.',
  'prompt.askingPriceFor': 'Hinihinging presyo para sa {name}.',
  'prompt.buy': 'Bilhin',
  'prompt.itemCosts': 'Ang presyo ng {name} ay {price}.',
  'prompt.thisItem': 'Ang item na ito',
  'prompt.itemGone': 'Wala na ang item na ito.',
  'prompt.buyHowMany': 'Ilan ang {name}? {price} bawat isa.',
  'prompt.quantity': 'Dami',
  'prompt.carrying': 'May dala kang {amount}.',
  'prompt.vaultHolds': 'May laman ang bodega na {amount}.',
  'prompt.newPinHint': 'Kailangan ang password ng iyong account para sa bagong PIN.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Password',
  'prompt.wantsToTrade': 'Gustong makipagpalitan sa iyo ni {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
