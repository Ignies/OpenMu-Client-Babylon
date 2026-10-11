/** Spanish text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'Error de conexión WebSocket',
  'notify.connectionLost': 'Se perdió la conexión con el servidor',
  'notify.serverListLost': 'Se perdió la conexión con la lista de servidores',
  'notify.helperStarted': 'MU Helper iniciado',
  'notify.helperStopped': 'MU Helper detenido',
  'notify.helperSafeZone': 'MU Helper no puede empezar en una zona segura',
  'notify.helperCost': 'MU Helper ha gastado {total} Zen',
  'notify.zenCap': 'No puedes llevar más de 2.000.000.000 de Zen',
  'notify.cannotSell': 'Este objeto no se puede vender',
  'notify.merchantRefuses': 'El mercader no quiere ese objeto',
  'notify.learnedSkill': 'Has aprendido {name}',
  'notify.storageOpen': 'No puedes usar objetos con el almacén abierto',
  'notify.upgradeNeedsServer': 'La mejora necesita un servidor',
  'notify.noAnswerRestored':
    'El servidor no respondió: el objeto se ha restaurado',
  'notify.cannotBuy': 'No puedes comprar ese objeto',
  'notify.updateAvailable': 'Hay una versión nueva: la página se recarga al volver a la lista de servidores.',
} satisfies Partial<Record<keyof typeof en, string>>;
