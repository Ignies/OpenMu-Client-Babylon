/** Polish text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'Błąd połączenia WebSocket',
  'notify.connectionLost': 'Utracono połączenie z serwerem',
  'notify.serverListLost': 'Utracono połączenie z listą serwerów',
  'notify.helperStarted': 'MU Helper uruchomiony',
  'notify.helperStopped': 'MU Helper zatrzymany',
  'notify.helperSafeZone': 'MU Helper nie może działać w strefie bezpiecznej',
  'notify.helperCost': 'MU Helper zużył {total} Zen',
  'notify.zenCap': 'Nie możesz mieć przy sobie więcej niż 2 000 000 000 Zen',
  'notify.cannotSell': 'Tego przedmiotu nie można sprzedać',
  'notify.merchantRefuses': 'Kupiec nie chce tego przedmiotu',
  'notify.learnedSkill': 'Nauczono się umiejętności: {name}',
  'notify.storageOpen': 'Nie możesz używać przedmiotów, gdy magazyn jest otwarty',
  'notify.upgradeNeedsServer': 'Ulepszanie wymaga serwera',
  'notify.noAnswerRestored': 'Serwer nie odpowiedział - przedmiot przywrócony',
  'notify.cannotBuy': 'Nie możesz kupić tego przedmiotu',
} satisfies Partial<Record<keyof typeof en, string>>;
