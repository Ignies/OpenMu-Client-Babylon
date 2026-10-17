/** sr-Latn text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'Ovaj svet navodi modul koji ne može da se pročita ({id}): preskočen',
  'moduleStream.api': 'Modul {id} traži API modula {range}, ovaj klijent nudi {have}: preskočen',
  'moduleStream.download': 'Modul {id} nije mogao da se preuzme: preskočen',
  'moduleStream.hash': 'Modul {id} se ne poklapa sa svojim hešom: preskočen',
  'moduleStream.core': 'Modul {id} tvrdi da je osnovni modul: odbijen',
  'moduleStream.builtIn': 'Modul {id} ima ime ugrađenog modula: odbijen',
  'moduleStream.declined': 'Modul {id} nije dozvoljen: preskočen',
  'moduleStream.failed': 'Modul {id} nije uspeo da se pokrene: uklonjen',
} satisfies Partial<Record<keyof typeof en, string>>;
