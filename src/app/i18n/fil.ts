/** fil text of `src/app`. */

import type en from './en';

export default {
  'notify.wsError': 'Error sa koneksyon ng WebSocket',
  'notify.connectionLost': 'Naputol ang koneksyon sa server',
  'notify.serverListLost': 'Naputol ang koneksyon sa listahan ng server',
  'notify.helperStarted': 'Sinimulan ang MU Helper',
  'notify.helperStopped': 'Itinigil ang MU Helper',
  'notify.helperSafeZone': 'Hindi masisimulan ang MU Helper sa ligtas na lugar',
  'notify.helperCost': 'Nakagamit na ang MU Helper ng {total} Zen',
  'notify.zenCap': 'Hindi ka makapagdadala ng higit sa 2,000,000,000 Zen',
  'notify.cannotSell': 'Hindi maibebenta ang item na ito',
  'notify.merchantRefuses': 'Ayaw ng mangangalakal sa item na iyan',
  'notify.learnedSkill': 'Natutunan mo ang {name}',
  'notify.storageOpen': 'Hindi ka makagagamit ng item habang bukas ang bodega',
  'notify.upgradeNeedsServer': 'Kailangan ng server para mag-upgrade',
  'notify.noAnswerRestored': 'Hindi sumagot ang server - ibinalik ang item',
  'notify.cannotBuy': 'Hindi mo mabibili ang item na iyan',
  'notify.updateAvailable':
    'May bagong bersyon: magre-reload ang pahina pagbalik mo sa listahan ng server.',
} satisfies Partial<Record<keyof typeof en, string>>;
