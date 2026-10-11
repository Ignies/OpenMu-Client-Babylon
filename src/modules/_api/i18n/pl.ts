/** Polish text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'Ten świat podaje moduł, którego nie da się odczytać ({id}): pominięty',
  'moduleStream.api': 'Moduł {id} wymaga API modułów {range}, ten klient obsługuje {have}: pominięty',
  'moduleStream.download': 'Nie udało się pobrać modułu {id}: pominięty',
  'moduleStream.hash': 'Moduł {id} nie zgadza się ze swoim skrótem: pominięty',
  'moduleStream.core': 'Moduł {id} podaje się za moduł podstawowy: odrzucony',
  'moduleStream.builtIn': 'Moduł {id} ma nazwę wbudowanego modułu: odrzucony',
  'moduleStream.declined': 'Moduł {id} nie został dopuszczony: pominięty',
  'moduleStream.failed': 'Moduł {id} nie uruchomił się: wyładowany',
} satisfies Partial<Record<keyof typeof en, string>>;
