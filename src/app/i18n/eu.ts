/** eu text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket konexio-errorea',
  'notify.connectionLost': 'Zerbitzariarekiko konexioa galdu da',
  'notify.serverListLost': 'Zerbitzari-zerrendarekiko konexioa galdu da',
  'notify.helperStarted': 'MU Helper martxan jarri da',
  'notify.helperStopped': 'MU Helper gelditu da',
  'notify.helperSafeZone': 'MU Helper ezin da gune seguruan abiarazi',
  'notify.helperCost': 'MU Helper: {total} Zen kontsumitu dira',
  'notify.zenCap': 'Ezin duzu 2.000.000.000 Zen baino gehiago eraman',
  'notify.cannotSell': 'Objektu hau ezin da saldu',
  'notify.merchantRefuses': 'Merkatariak ez du objektu hori nahi',
  'notify.learnedSkill': 'Ikasi duzu: {name}',
  'notify.storageOpen': 'Ezin duzu objekturik erabili biltegia irekita dagoen bitartean',
  'notify.upgradeNeedsServer': 'Hobetzeko zerbitzari bat behar da',
  'notify.noAnswerRestored': 'Zerbitzariak ez du erantzun: objektua berreskuratu da',
  'notify.cannotBuy': 'Ezin duzu objektu hori erosi',
  'notify.updateAvailable':
    'Bertsio berri bat dago: orria berriro kargatuko da zerbitzari-zerrendara itzultzen zarenean.',
} satisfies Partial<Record<keyof typeof en, string>>;
