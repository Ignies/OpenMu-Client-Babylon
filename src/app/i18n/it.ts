/** Italian text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'Errore di connessione WebSocket',
  'notify.connectionLost': 'La connessione al server è caduta',
  'notify.serverListLost': 'La connessione alla lista dei server è caduta',
  'notify.helperStarted': 'MU Helper avviato',
  'notify.helperStopped': 'MU Helper fermato',
  'notify.helperSafeZone': 'MU Helper non può partire in una zona sicura',
  'notify.helperCost': 'Il MU Helper ha speso {total} Zen',
  'notify.zenCap': 'Non puoi portare più di 2.000.000.000 di Zen',
  'notify.cannotSell': 'Questo oggetto non si può vendere',
  'notify.merchantRefuses': 'Il mercante non vuole quell’oggetto',
  'notify.learnedSkill': 'Hai appreso {name}',
  'notify.storageOpen': 'Non puoi usare oggetti con il deposito aperto',
  'notify.upgradeNeedsServer': 'Il potenziamento ha bisogno di un server',
  'notify.noAnswerRestored':
    'Il server non ha risposto - oggetto ripristinato',
  'notify.cannotBuy': 'Non puoi comprare quell’oggetto',
  'notify.updateAvailable': 'È uscita una nuova versione: la pagina si ricarica quando torni all’elenco dei server.',
} satisfies Partial<Record<keyof typeof en, string>>;
