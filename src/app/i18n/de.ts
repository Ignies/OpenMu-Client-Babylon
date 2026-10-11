/** German text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket-Verbindungsfehler',
  'notify.connectionLost': 'Die Verbindung zum Server ging verloren',
  'notify.serverListLost': 'Die Verbindung zur Serverliste ging verloren',
  'notify.helperStarted': 'MU Helper gestartet',
  'notify.helperStopped': 'MU Helper gestoppt',
  'notify.helperSafeZone': 'MU Helper kann in einer sicheren Zone nicht starten',
  'notify.helperCost': 'MU Helper hat {total} Zen verbraucht',
  'notify.zenCap': 'Du kannst nicht mehr als 2.000.000.000 Zen tragen',
  'notify.cannotSell': 'Dieser Gegenstand lässt sich nicht verkaufen',
  'notify.merchantRefuses': 'Der Händler will diesen Gegenstand nicht',
  'notify.learnedSkill': 'Du hast {name} gelernt',
  'notify.storageOpen': 'Bei geöffnetem Lager kannst du nichts benutzen',
  'notify.upgradeNeedsServer': 'Die Aufwertung braucht einen Server',
  'notify.noAnswerRestored':
    'Der Server hat nicht geantwortet - Gegenstand wiederhergestellt',
  'notify.cannotBuy': 'Diesen Gegenstand kannst du nicht kaufen',
  'notify.updateAvailable': 'Eine neue Version ist da: Die Seite lädt neu, sobald du die Welt verlässt.',
} satisfies Partial<Record<keyof typeof en, string>>;
