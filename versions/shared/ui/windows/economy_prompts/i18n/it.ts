/** Italian text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Deposita Zen',
  'prompt.takeZen': 'Preleva Zen',
  'prompt.unlockVault': 'Sblocca il deposito',
  'prompt.enterPin': 'Inserisci il PIN del deposito.',
  'prompt.setPin': 'Imposta un PIN',
  'prompt.removePin': 'Rimuovi il PIN del deposito',
  'prompt.removePinHint': 'Per rimuovere il PIN serve la password dell’account.',
  'prompt.offerZen': 'Offri Zen',
  'prompt.setPrice': 'Imposta un prezzo',
  'prompt.askingPrice': 'Prezzo richiesto.',
  'prompt.askingPriceFor': 'Prezzo richiesto per {name}.',
  'prompt.buy': 'Compra',
  'prompt.itemCosts': '{name} costa {price}.',
  'prompt.thisItem': 'Questo oggetto',
  'prompt.itemGone': 'Questo oggetto non c’è più.',
  'prompt.buyHowMany': 'Quante unità di {name}? {price} per unità.',
  'prompt.quantity': 'Quantità',
  'prompt.carrying': 'Hai con te {amount}.',
  'prompt.vaultHolds': 'Il deposito contiene {amount}.',
  'prompt.newPinHint': 'Un nuovo PIN richiede la password dell’account.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Password',
  'prompt.wantsToTrade': '{name} vuole scambiare con te.',
  'prompt.bundle': 'Raggruppa',
  'prompt.bundleAsk': 'Vuoi raggruppare {count} {name}?',
  'prompt.unbundle': 'Separa',
  'prompt.unbundleAsk': 'Vuoi separare il gruppo di {count} {name}?',
} satisfies Partial<Record<keyof typeof en, string>>;
