/** German text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Zen einlagern',
  'prompt.takeZen': 'Zen abheben',
  'prompt.unlockVault': 'Lager entsperren',
  'prompt.enterPin': 'Gib die Lager-PIN ein.',
  'prompt.setPin': 'Lager-PIN setzen',
  'prompt.removePin': 'Lager-PIN entfernen',
  'prompt.removePinHint': 'Zum Entfernen der PIN brauchst du dein Kontopasswort.',
  'prompt.offerZen': 'Zen anbieten',
  'prompt.setPrice': 'Preis setzen',
  'prompt.askingPrice': 'Verkaufspreis.',
  'prompt.askingPriceFor': 'Verkaufspreis für {name}.',
  'prompt.buy': 'Kaufen',
  'prompt.itemCosts': '{name} kostet {price}.',
  'prompt.thisItem': 'Dieser Gegenstand',
  'prompt.itemGone': 'Dieser Gegenstand ist weg.',
  'prompt.buyHowMany': 'Wie viele {name}? Je {price}.',
  'prompt.quantity': 'Anzahl',
  'prompt.carrying': 'Du trägst {amount}.',
  'prompt.vaultHolds': 'Im Lager liegen {amount}.',
  'prompt.newPinHint': 'Eine neue PIN braucht dein Kontopasswort.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Passwort',
  'prompt.wantsToTrade': '{name} möchte mit dir handeln.',
  'prompt.bundle': 'Bündeln',
  'prompt.bundleAsk': '{count} {name} bündeln?',
  'prompt.unbundle': 'Aufteilen',
  'prompt.unbundleAsk': 'Das Bündel aus {count} {name} aufteilen?',
} satisfies Partial<Record<keyof typeof en, string>>;
