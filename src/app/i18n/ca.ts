/** ca text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'Error de connexió WebSocket',
  'notify.connectionLost': 'S\'ha perdut la connexió amb el servidor',
  'notify.serverListLost': 'S\'ha perdut la connexió amb la llista de servidors',
  'notify.helperStarted': 'MU Helper iniciat',
  'notify.helperStopped': 'MU Helper aturat',
  'notify.helperSafeZone': 'El MU Helper no es pot iniciar en una zona segura',
  'notify.helperCost': 'El MU Helper ha consumit {total} Zen',
  'notify.zenCap': 'No pots portar més de 2.000.000.000 Zen',
  'notify.cannotSell': 'Aquest objecte no es pot vendre',
  'notify.merchantRefuses': 'El mercader no vol aquest objecte',
  'notify.learnedSkill': 'Has après {name}',
  'notify.storageOpen': 'No pots fer servir objectes mentre el magatzem és obert',
  'notify.upgradeNeedsServer': 'Per millorar objectes cal un servidor',
  'notify.noAnswerRestored': 'El servidor no ha respost: s\'ha restaurat l\'objecte',
  'notify.cannotBuy': 'No pots comprar aquest objecte',
} satisfies Partial<Record<keyof typeof en, string>>;
