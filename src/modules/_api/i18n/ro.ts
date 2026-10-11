/** Romanian text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'Această lume listează un modul care nu poate fi citit ({id}): omis',
  'moduleStream.api': 'Modulul {id} cere API-ul de module {range}, acest client oferă {have}: omis',
  'moduleStream.download': 'Modulul {id} nu a putut fi descărcat: omis',
  'moduleStream.hash': 'Modulul {id} nu se potrivește cu hash-ul său: omis',
  'moduleStream.core': 'Modulul {id} pretinde că este un modul de bază: refuzat',
  'moduleStream.builtIn': 'Modulul {id} are numele unui modul inclus: refuzat',
  'moduleStream.declined': 'Modulul {id} nu a fost permis: omis',
  'moduleStream.failed': 'Modulul {id} nu a pornit: descărcat',
} satisfies Partial<Record<keyof typeof en, string>>;
