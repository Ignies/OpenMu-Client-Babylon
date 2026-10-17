/** hu text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Zen berakása',
  'prompt.takeZen': 'Zen kivétele',
  'prompt.unlockVault': 'Raktár feloldása',
  'prompt.enterPin': 'Add meg a raktár PIN-kódját.',
  'prompt.setPin': 'Raktár-PIN beállítása',
  'prompt.removePin': 'Raktár-PIN eltávolítása',
  'prompt.removePinHint': 'A PIN eltávolításához a fiókod jelszava kell.',
  'prompt.offerZen': 'Zen felajánlása',
  'prompt.setPrice': 'Ár megadása',
  'prompt.askingPrice': 'Kért ár.',
  'prompt.askingPriceFor': '{name} kért ára.',
  'prompt.buy': 'Vásárlás',
  'prompt.itemCosts': '{name} ára: {price}.',
  'prompt.thisItem': 'Ez a tárgy',
  'prompt.itemGone': 'Ez a tárgy már nincs meg.',
  'prompt.buyHowMany': 'Hány darabot veszel ebből: {name}? Darabja {price}.',
  'prompt.quantity': 'Mennyiség',
  'prompt.carrying': 'Nálad van: {amount}.',
  'prompt.vaultHolds': 'A raktárban: {amount}.',
  'prompt.newPinHint': 'Új PIN-hez a fiókod jelszava kell.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Jelszó',
  'prompt.wantsToTrade': '{name} cserélni szeretne veled.',
  'prompt.bundle': 'Kötegelés',
  'prompt.bundleAsk': 'Szeretnéd köteggé fogni ezt: {count} db {name}?',
  'prompt.unbundle': 'Szétbontás',
  'prompt.unbundleAsk': 'Szeretnéd szétbontani ezt a köteget: {count} db {name}?',
} satisfies Partial<Record<keyof typeof en, string>>;
