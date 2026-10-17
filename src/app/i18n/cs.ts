/** cs text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'Chyba spojení WebSocket',
  'notify.connectionLost': 'Spojení se serverem bylo ztraceno',
  'notify.serverListLost': 'Spojení se seznamem serverů bylo ztraceno',
  'notify.helperStarted': 'MU Helper spuštěn',
  'notify.helperStopped': 'MU Helper zastaven',
  'notify.helperSafeZone': 'MU Helper nelze spustit v bezpečné zóně',
  'notify.helperCost': 'Spotřeba MU Helper: {total} Zen',
  'notify.zenCap': 'Nemůžeš u sebe mít víc než 2 000 000 000 Zen',
  'notify.cannotSell': 'Tento předmět nelze prodat',
  'notify.merchantRefuses': 'Obchodník tento předmět nechce',
  'notify.learnedSkill': 'Naučená dovednost: {name}',
  'notify.storageOpen': 'Předměty nelze používat, když je otevřený sklad',
  'notify.upgradeNeedsServer': 'Vylepšování vyžaduje server',
  'notify.noAnswerRestored': 'Server neodpověděl – předmět obnoven',
  'notify.cannotBuy': 'Tento předmět nemůžeš koupit',
} satisfies Partial<Record<keyof typeof en, string>>;
