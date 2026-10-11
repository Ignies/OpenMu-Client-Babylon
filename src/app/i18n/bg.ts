/** Bulgarian text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'Грешка във връзката WebSocket',
  'notify.connectionLost': 'Връзката със сървъра се разпадна',
  'notify.serverListLost': 'Връзката със списъка със сървъри се разпадна',
  'notify.helperStarted': 'MU Helper е пуснат',
  'notify.helperStopped': 'MU Helper е спрян',
  'notify.helperSafeZone': 'MU Helper не може да стартира в безопасна зона',
  'notify.helperCost': 'MU Helper изразходва {total} Zen',
  'notify.zenCap': 'Не можеш да носиш повече от 2 000 000 000 Zen',
  'notify.cannotSell': 'Този предмет не може да се продаде',
  'notify.merchantRefuses': 'Търговецът не иска този предмет',
  'notify.learnedSkill': 'Научи {name}',
  'notify.storageOpen': 'Не можеш да използваш предмети при отворен трезор',
  'notify.upgradeNeedsServer': 'Подобряването има нужда от сървър',
  'notify.noAnswerRestored': 'Сървърът не отговори - предметът е върнат',
  'notify.cannotBuy': 'Не можеш да купиш този предмет',
  'notify.updateAvailable': 'Има нова версия: страницата ще се презареди, когато се върнете към списъка със сървъри.',
} satisfies Partial<Record<keyof typeof en, string>>;
