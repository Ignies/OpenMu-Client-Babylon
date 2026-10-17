/** Polish text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': 'Zdeponuj Zen',
  'prompt.takeZen': 'Wypłać Zen',
  'prompt.unlockVault': 'Odblokuj magazyn',
  'prompt.enterPin': 'Wpisz PIN magazynu.',
  'prompt.setPin': 'Ustaw PIN magazynu',
  'prompt.removePin': 'Usuń PIN magazynu',
  'prompt.removePinHint': 'Usunięcie PIN-u wymaga hasła do konta.',
  'prompt.offerZen': 'Zaoferuj Zen',
  'prompt.setPrice': 'Ustaw cenę',
  'prompt.askingPrice': 'Cena wywoławcza.',
  'prompt.askingPriceFor': 'Cena wywoławcza za {name}.',
  'prompt.buy': 'Kup',
  'prompt.itemCosts': 'Cena {name}: {price}.',
  'prompt.thisItem': 'Ten przedmiot',
  'prompt.itemGone': 'Tego przedmiotu już nie ma.',
  'prompt.buyHowMany': 'Ile sztuk {name}? {price} za sztukę.',
  'prompt.quantity': 'Ilość',
  'prompt.carrying': 'Masz przy sobie {amount}.',
  'prompt.vaultHolds': 'W magazynie jest {amount}.',
  'prompt.newPinHint': 'Nowy PIN wymaga hasła do konta.',
  'prompt.pin': 'PIN',
  'prompt.password': 'Hasło',
  'prompt.wantsToTrade': '{name} chce z tobą handlować.',
  'prompt.bundle': 'Połącz',
  'prompt.bundleAsk': 'Połączyć {count} szt. {name}?',
  'prompt.unbundle': 'Rozdziel',
  'prompt.unbundleAsk': 'Rozdzielić paczkę {count} szt. {name}?',
} satisfies Partial<Record<keyof typeof en, string>>;
