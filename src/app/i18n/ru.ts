/** Russian text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'Ошибка соединения WebSocket',
  'notify.connectionLost': 'Связь с сервером потеряна',
  'notify.serverListLost': 'Связь со списком серверов потеряна',
  'notify.helperStarted': 'MU Helper запущен',
  'notify.helperStopped': 'MU Helper остановлен',
  'notify.helperSafeZone': 'MU Helper нельзя запустить в безопасной зоне',
  'notify.helperCost': 'MU Helper потратил {total} Zen',
  'notify.zenCap': 'Нельзя носить больше 2 000 000 000 Zen',
  'notify.cannotSell': 'Этот предмет нельзя продать',
  'notify.merchantRefuses': 'Торговцу не нужен этот предмет',
  'notify.learnedSkill': 'Вы изучили {name}',
  'notify.storageOpen': 'Нельзя использовать предметы при открытом хранилище',
  'notify.upgradeNeedsServer': 'Для улучшения нужен сервер',
  'notify.noAnswerRestored': 'Сервер не ответил - предмет восстановлен',
  'notify.cannotBuy': 'Этот предмет купить нельзя',
  'notify.updateAvailable': 'Вышла новая версия: страница перезагрузится, когда вы покинете мир.',
} satisfies Partial<Record<keyof typeof en, string>>;
