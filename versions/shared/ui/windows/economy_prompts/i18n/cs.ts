/** cs text of `versions/shared/ui/windows/economy_prompts`. */

import type en from './en';

export default {
  'prompt.storeZen': 'Uložit Zen',
  'prompt.takeZen': 'Vybrat Zen',
  'prompt.unlockVault': 'Odemknout sklad',
  'prompt.enterPin': 'Zadej PIN skladu.',
  'prompt.setPin': 'Nastavit PIN skladu',
  'prompt.removePin': 'Odstranit PIN skladu',
  'prompt.removePinHint': 'K odstranění PIN je potřeba heslo k účtu.',
  'prompt.offerZen': 'Nabídnout Zen',
  'prompt.setPrice': 'Nastavit cenu',
  'prompt.askingPrice': 'Požadovaná cena.',
  'prompt.askingPriceFor': 'Požadovaná cena za: {name}.',
  'prompt.buy': 'Koupit',
  'prompt.itemCosts': '{name} stojí {price}.',
  'prompt.thisItem': 'Tento předmět',
  'prompt.itemGone': 'Tento předmět už tu není.',
  'prompt.buyHowMany': '{name}: kolik kusů? {price} za kus.',
  'prompt.quantity': 'Množství',
  'prompt.carrying': 'U sebe máš {amount}.',
  'prompt.vaultHolds': 'Ve skladu je {amount}.',
  'prompt.newPinHint': 'Nový PIN vyžaduje heslo k účtu.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Heslo',
  'prompt.wantsToTrade': 'Hráč {name} s tebou chce obchodovat.',
  'prompt.bundle': 'Sbalit',
  'prompt.bundleAsk': 'Chceš sbalit {name} (kusů: {count})?',
  'prompt.unbundle': 'Rozbalit',
  'prompt.unbundleAsk': 'Chceš rozbalit balík {name} (kusů: {count})?',
} satisfies Partial<Record<keyof typeof en, string>>;
