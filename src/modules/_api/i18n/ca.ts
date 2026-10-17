/** ca text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'Aquest món inclou un mòdul que no es pot llegir ({id}): s\'omet',
  'moduleStream.api':
    'El mòdul {id} necessita l\'API de mòduls {range} i aquest client ofereix la {have}: s\'omet',
  'moduleStream.download': 'No s\'ha pogut baixar el mòdul {id}: s\'omet',
  'moduleStream.hash': 'El mòdul {id} no coincideix amb el seu hash: s\'omet',
  'moduleStream.core': 'El mòdul {id} diu que és un mòdul del nucli: es rebutja',
  'moduleStream.builtIn': 'El mòdul {id} té el nom d\'un mòdul integrat: es rebutja',
  'moduleStream.declined': 'No s\'ha permès el mòdul {id}: s\'omet',
  'moduleStream.failed': 'El mòdul {id} no s\'ha pogut iniciar: es descarrega',
} satisfies Partial<Record<keyof typeof en, string>>;
