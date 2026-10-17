/** uk text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'Помилка з’єднання WebSocket',
  'notify.connectionLost': 'З’єднання з сервером втрачено',
  'notify.serverListLost': 'З’єднання зі списком серверів втрачено',
  'notify.helperStarted': 'MU Helper запущено',
  'notify.helperStopped': 'MU Helper зупинено',
  'notify.helperSafeZone': 'MU Helper не можна запустити в безпечній зоні',
  'notify.helperCost': 'MU Helper витратив {total} Zen',
  'notify.zenCap': 'Не можна мати при собі понад 2 000 000 000 Zen',
  'notify.cannotSell': 'Цей предмет не можна продати',
  'notify.merchantRefuses': 'Торговцеві не потрібен цей предмет',
  'notify.learnedSkill': 'Ви вивчили навичку {name}',
  'notify.storageOpen': 'Не можна використовувати предмети, поки відкрите сховище',
  'notify.upgradeNeedsServer': 'Для покращення потрібен сервер',
  'notify.noAnswerRestored': 'Сервер не відповів — предмет відновлено',
  'notify.cannotBuy': 'Цей предмет не можна купити',
} satisfies Partial<Record<keyof typeof en, string>>;
