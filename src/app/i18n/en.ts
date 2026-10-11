/** English text of the app shell (`src/app`). See src/i18n/readme.md. */

const en = {
  'notify.wsError': 'WebSocket connection error',
  'notify.connectionLost': 'Connection to the server was lost',
  'notify.serverListLost': 'Connection to the server list was lost',
  'notify.helperStarted': 'MU Helper started',
  'notify.helperStopped': 'MU Helper stopped',
  'notify.helperSafeZone': 'MU Helper cannot start in a safe zone',
  'notify.helperCost': 'MU Helper has consumed {total} Zen',
  'notify.zenCap': 'You cannot carry more than 2,000,000,000 Zen',
  'notify.cannotSell': 'This item cannot be sold',
  'notify.merchantRefuses': 'The merchant does not want that item',
  'notify.learnedSkill': 'You have learned {name}',
  'notify.storageOpen': 'You cannot use items while the storage is open',
  'notify.upgradeNeedsServer': 'Upgrading needs a server',
  'notify.noAnswerRestored': 'The server did not answer - item restored',
  'notify.cannotBuy': 'You cannot buy that item',
  /** `buildCheck.ts`: a new build is out while the player is in the world. */
  'notify.updateAvailable': 'A new version is out: the page reloads when you leave the world.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/app': typeof en;
  }
}
