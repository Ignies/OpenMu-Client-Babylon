/** Romanian text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'Eroare de conexiune WebSocket',
  'notify.connectionLost': 'Conexiunea cu serverul s-a pierdut',
  'notify.serverListLost': 'Conexiunea cu lista de servere s-a pierdut',
  'notify.helperStarted': 'MU Helper pornit',
  'notify.helperStopped': 'MU Helper oprit',
  'notify.helperSafeZone': 'MU Helper nu poate porni într-o zonă sigură',
  'notify.helperCost': 'MU Helper a consumat {total} Zen',
  'notify.zenCap': 'Nu poți purta mai mult de 2.000.000.000 Zen',
  'notify.cannotSell': 'Acest obiect nu poate fi vândut',
  'notify.merchantRefuses': 'Negustorul nu vrea acel obiect',
  'notify.learnedSkill': 'Ai învățat {name}',
  'notify.storageOpen': 'Nu poți folosi obiecte cât timp seiful este deschis',
  'notify.upgradeNeedsServer': 'Îmbunătățirea are nevoie de un server',
  'notify.noAnswerRestored': 'Serverul nu a răspuns - obiectul a fost restaurat',
  'notify.cannotBuy': 'Nu poți cumpăra acel obiect',
} satisfies Partial<Record<keyof typeof en, string>>;
