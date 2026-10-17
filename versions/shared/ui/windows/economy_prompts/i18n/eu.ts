/** eu text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Gorde Zen',
  'prompt.takeZen': 'Atera Zen',
  'prompt.unlockVault': 'Desblokeatu biltegia',
  'prompt.enterPin': 'Idatzi biltegiaren PINa.',
  'prompt.setPin': 'Ezarri biltegiaren PINa',
  'prompt.removePin': 'Kendu biltegiaren PINa',
  'prompt.removePinHint': 'PINa kentzeko zure kontuaren pasahitza behar da.',
  'prompt.offerZen': 'Eskaini Zen',
  'prompt.setPrice': 'Ezarri prezioa',
  'prompt.askingPrice': 'Eskatutako prezioa.',
  'prompt.askingPriceFor': 'Eskatutako prezioa ({name}).',
  'prompt.buy': 'Erosi',
  'prompt.itemCosts': '{name}: {price} balio du.',
  'prompt.thisItem': 'Objektu hau',
  'prompt.itemGone': 'Objektu hau jada ez dago.',
  'prompt.buyHowMany': 'Zenbat unitate ({name})? {price} unitateko.',
  'prompt.quantity': 'Kopurua',
  'prompt.carrying': 'Daramazuna: {amount}.',
  'prompt.vaultHolds': 'Biltegian dagoena: {amount}.',
  'prompt.newPinHint': 'PIN berri batek zure kontuaren pasahitza behar du.',
  'prompt.pin': 'PINa',
  'prompt.password': 'Pasahitza',
  'prompt.wantsToTrade': '{name} jokalariak zurekin trukatu nahi du.',
  'prompt.bundle': 'Bildu',
  'prompt.bundleAsk': '{count} {name} sorta batean bildu nahi dituzu?',
  'prompt.unbundle': 'Desegin sorta',
  'prompt.unbundleAsk': 'Sorta hau desegin nahi duzu? ({count} {name})',
} satisfies Partial<Record<keyof typeof en, string>>;
