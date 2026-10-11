/** French text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'Erreur de connexion WebSocket',
  'notify.connectionLost': 'La connexion au serveur a été perdue',
  'notify.serverListLost': 'La connexion à la liste des serveurs a été perdue',
  'notify.helperStarted': 'MU Helper démarré',
  'notify.helperStopped': 'MU Helper arrêté',
  'notify.helperSafeZone': 'MU Helper ne peut pas démarrer en zone sûre',
  'notify.helperCost': 'Le MU Helper a consommé {total} Zen',
  'notify.zenCap': 'Vous ne pouvez pas porter plus de 2 000 000 000 de Zen',
  'notify.cannotSell': 'Cet objet ne peut pas être vendu',
  'notify.merchantRefuses': 'Le marchand ne veut pas de cet objet',
  'notify.learnedSkill': 'Vous avez appris {name}',
  'notify.storageOpen': 'Impossible d’utiliser des objets, le coffre est ouvert',
  'notify.upgradeNeedsServer': 'L’amélioration a besoin d’un serveur',
  'notify.noAnswerRestored': 'Le serveur n’a pas répondu - objet restauré',
  'notify.cannotBuy': 'Vous ne pouvez pas acheter cet objet',
  'notify.updateAvailable': 'Une nouvelle version est disponible : la page se recharge quand vous quittez le monde.',
} satisfies Partial<Record<keyof typeof en, string>>;
