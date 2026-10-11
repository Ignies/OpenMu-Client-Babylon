/** German text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'Diese Welt nennt ein Modul, das nicht gelesen werden kann ({id}): übersprungen',
  'moduleStream.api': 'Modul {id} braucht die Modul-API {range}, dieser Client bietet {have}: übersprungen',
  'moduleStream.download': 'Modul {id} konnte nicht heruntergeladen werden: übersprungen',
  'moduleStream.hash': 'Modul {id} passt nicht zu seinem Hash: übersprungen',
  'moduleStream.core': 'Modul {id} gibt sich als Kernmodul aus: abgelehnt',
  'moduleStream.builtIn': 'Modul {id} trägt den Namen eines eingebauten Moduls: abgelehnt',
  'moduleStream.declined': 'Modul {id} wurde nicht erlaubt: übersprungen',
  'moduleStream.failed': 'Modul {id} konnte nicht starten: entladen',
} satisfies Partial<Record<keyof typeof en, string>>;
