/** cs text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'Tento svět uvádí modul, který nelze přečíst ({id}): přeskočen',
  'moduleStream.api':
    'Modul {id} vyžaduje API modulů {range}, tento klient poskytuje {have}: přeskočen',
  'moduleStream.download': 'Modul {id} nelze stáhnout: přeskočen',
  'moduleStream.hash': 'Modul {id} neodpovídá svému hashi: přeskočen',
  'moduleStream.core': 'Modul {id} se vydává za základní modul: odmítnut',
  'moduleStream.builtIn': 'Modul {id} má název vestavěného modulu: odmítnut',
  'moduleStream.declined': 'Modul {id} nebyl povolen: přeskočen',
  'moduleStream.failed': 'Modul {id} se nepodařilo spustit: uvolněn',
} satisfies Partial<Record<keyof typeof en, string>>;
