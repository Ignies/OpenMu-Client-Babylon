/** Portuguese text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'Erro de conexão WebSocket',
  'notify.connectionLost': 'A conexão com o servidor foi perdida',
  'notify.serverListLost': 'A conexão com a lista de servidores foi perdida',
  'notify.helperStarted': 'MU Helper iniciado',
  'notify.helperStopped': 'MU Helper parado',
  'notify.helperSafeZone': 'O MU Helper não pode começar numa zona segura',
  'notify.helperCost': 'O MU Helper gastou {total} Zen',
  'notify.zenCap': 'Você não pode carregar mais de 2.000.000.000 de Zen',
  'notify.cannotSell': 'Este item não pode ser vendido',
  'notify.merchantRefuses': 'O mercador não quer esse item',
  'notify.learnedSkill': 'Você aprendeu {name}',
  'notify.storageOpen': 'Você não pode usar itens com o baú aberto',
  'notify.upgradeNeedsServer': 'O aprimoramento precisa de um servidor',
  'notify.noAnswerRestored': 'O servidor não respondeu - item restaurado',
  'notify.cannotBuy': 'Você não pode comprar esse item',
} satisfies Partial<Record<keyof typeof en, string>>;
