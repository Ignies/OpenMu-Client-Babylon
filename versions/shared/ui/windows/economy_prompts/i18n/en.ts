/** English text of the `economy_prompts` window. See src/i18n/readme.md. */

const en = {
  'prompt.storeZen': 'Store Zen',
  'prompt.takeZen': 'Take Zen',
  'prompt.unlockVault': 'Unlock the vault',
  'prompt.enterPin': 'Enter the vault pin.',
  'prompt.setPin': 'Set a vault pin',
  'prompt.removePin': 'Remove the vault pin',
  'prompt.removePinHint': 'Removing the pin needs your account password.',
  'prompt.offerZen': 'Offer Zen',
  'prompt.setPrice': 'Set a price',
  'prompt.askingPrice': 'Asking price.',
  'prompt.askingPriceFor': 'Asking price for {name}.',
  'prompt.buy': 'Buy',
  'prompt.itemCosts': '{name} costs {price}.',
  'prompt.thisItem': 'This item',
  'prompt.itemGone': 'This item is gone.',
  'prompt.buyHowMany': 'How many {name}? {price} each.',
  'prompt.quantity': 'Quantity',
  'prompt.carrying': 'You are carrying {amount}.',
  'prompt.vaultHolds': 'The vault holds {amount}.',
  'prompt.newPinHint': 'A new pin needs your account password.',
  'prompt.pin': 'Pin',
  'prompt.password': 'Password',
  'prompt.wantsToTrade': '{name} wants to trade with you.',
  'prompt.bundle': 'Bundle',
  'prompt.bundleAsk': 'Do you want to bundle {count} {name}?',
  'prompt.unbundle': 'Unbundle',
  'prompt.unbundleAsk': 'Do you want to unbundle the bundle of {count} {name}?',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/economy_prompts': typeof en;
  }
}
