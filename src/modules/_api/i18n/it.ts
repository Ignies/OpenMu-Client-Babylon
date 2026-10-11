/** Italian text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'Questo mondo elenca un modulo illeggibile ({id}): saltato',
  'moduleStream.api': 'Il modulo {id} richiede l\'API dei moduli {range}, questo client offre {have}: saltato',
  'moduleStream.download': 'Impossibile scaricare il modulo {id}: saltato',
  'moduleStream.hash': 'Il modulo {id} non corrisponde al suo hash: saltato',
  'moduleStream.core': 'Il modulo {id} si dichiara modulo di base: rifiutato',
  'moduleStream.builtIn': 'Il modulo {id} ha il nome di un modulo integrato: rifiutato',
  'moduleStream.declined': 'Il modulo {id} non è stato consentito: saltato',
  'moduleStream.failed': 'Il modulo {id} non è partito: scaricato',
} satisfies Partial<Record<keyof typeof en, string>>;
