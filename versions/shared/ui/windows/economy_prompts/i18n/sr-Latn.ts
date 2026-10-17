/** sr-Latn text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Ostavi Zen',
  'prompt.takeZen': 'Uzmi Zen',
  'prompt.unlockVault': 'Otključaj skladište',
  'prompt.enterPin': 'Unesi PIN skladišta.',
  'prompt.setPin': 'Postavi PIN skladišta',
  'prompt.removePin': 'Ukloni PIN skladišta',
  'prompt.removePinHint': 'Za uklanjanje PIN-a potrebna je lozinka naloga.',
  'prompt.offerZen': 'Ponudi Zen',
  'prompt.setPrice': 'Postavi cenu',
  'prompt.askingPrice': 'Tražena cena.',
  'prompt.askingPriceFor': 'Tražena cena za predmet {name}.',
  'prompt.buy': 'Kupi',
  'prompt.itemCosts': '{name}: cena {price}.',
  'prompt.thisItem': 'Ovaj predmet',
  'prompt.itemGone': 'Ovog predmeta više nema.',
  'prompt.buyHowMany': 'Koliko komada: {name}? Cena po komadu: {price}.',
  'prompt.quantity': 'Količina',
  'prompt.carrying': 'Kod sebe imaš {amount}.',
  'prompt.vaultHolds': 'U skladištu je {amount}.',
  'prompt.newPinHint': 'Za novi PIN potrebna je lozinka naloga.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Lozinka',
  'prompt.wantsToTrade': 'Igrač {name} želi razmenu sa tobom.',
} satisfies Partial<Record<keyof typeof en, string>>;
