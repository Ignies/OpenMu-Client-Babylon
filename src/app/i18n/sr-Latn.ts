/** sr-Latn text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'Greška WebSocket veze',
  'notify.connectionLost': 'Veza sa serverom je prekinuta',
  'notify.serverListLost': 'Veza sa listom servera je prekinuta',
  'notify.helperStarted': 'MU Helper je pokrenut',
  'notify.helperStopped': 'MU Helper je zaustavljen',
  'notify.helperSafeZone': 'MU Helper ne može da se pokrene u sigurnoj zoni',
  'notify.helperCost': 'MU Helper je potrošio {total} Zen',
  'notify.zenCap': 'Ne možeš da nosiš više od 2.000.000.000 Zen',
  'notify.cannotSell': 'Ovaj predmet ne može da se proda',
  'notify.merchantRefuses': 'Trgovac ne želi taj predmet',
  'notify.learnedSkill': 'Naučena veština: {name}',
  'notify.storageOpen': 'Ne možeš da koristiš predmete dok je skladište otvoreno',
  'notify.upgradeNeedsServer': 'Za unapređivanje je potreban server',
  'notify.noAnswerRestored': 'Server nije odgovorio: predmet je vraćen',
  'notify.cannotBuy': 'Ne možeš da kupiš taj predmet',
} satisfies Partial<Record<keyof typeof en, string>>;
