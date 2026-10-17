/** hu text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket kapcsolati hiba',
  'notify.connectionLost': 'Megszakadt a kapcsolat a szerverrel',
  'notify.serverListLost': 'Megszakadt a kapcsolat a szerverlistával',
  'notify.helperStarted': 'MU Helper elindítva',
  'notify.helperStopped': 'MU Helper leállítva',
  'notify.helperSafeZone': 'A MU Helper biztonsági zónában nem indítható',
  'notify.helperCost': 'A MU Helper eddig {total} Zent használt el',
  'notify.zenCap': 'Legfeljebb 2 000 000 000 Zen lehet nálad',
  'notify.cannotSell': 'Ez a tárgy nem adható el',
  'notify.merchantRefuses': 'A kereskedő nem kér ebből a tárgyból',
  'notify.learnedSkill': 'Megtanultad: {name}',
  'notify.storageOpen': 'Nyitott raktár mellett nem használhatsz tárgyakat',
  'notify.upgradeNeedsServer': 'A fejlesztéshez szerver kell',
  'notify.noAnswerRestored': 'A szerver nem válaszolt, a tárgy visszaállítva',
  'notify.cannotBuy': 'Ezt a tárgyat nem veheted meg',
} satisfies Partial<Record<keyof typeof en, string>>;
