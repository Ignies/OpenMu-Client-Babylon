/** Romanian text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Depune Zen',
  'prompt.takeZen': 'Retrage Zen',
  'prompt.unlockVault': 'Deblochează seiful',
  'prompt.enterPin': 'Introdu PIN-ul seifului.',
  'prompt.setPin': 'Pune un PIN',
  'prompt.removePin': 'Scoate PIN-ul seifului',
  'prompt.removePinHint': 'Scoaterea PIN-ului cere parola contului.',
  'prompt.offerZen': 'Oferă Zen',
  'prompt.setPrice': 'Pune un preț',
  'prompt.askingPrice': 'Prețul cerut.',
  'prompt.askingPriceFor': 'Prețul cerut pentru {name}.',
  'prompt.buy': 'Cumpără',
  'prompt.itemCosts': '{name} costă {price}.',
  'prompt.thisItem': 'Acest obiect',
  'prompt.itemGone': 'Acest obiect nu mai este.',
  'prompt.buyHowMany': 'Câte bucăți de {name}? {price} bucata.',
  'prompt.quantity': 'Cantitate',
  'prompt.carrying': 'Ai la tine {amount}.',
  'prompt.vaultHolds': 'Seiful conține {amount}.',
  'prompt.newPinHint': 'Un PIN nou cere parola contului tău.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Parolă',
  'prompt.wantsToTrade': '{name} vrea să facă schimb cu tine.',
} satisfies Partial<Record<keyof typeof en, string>>;
