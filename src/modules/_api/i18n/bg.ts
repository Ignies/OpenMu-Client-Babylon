/** Bulgarian text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'Този свят посочва модул, който не може да се прочете ({id}): пропуснат',
  'moduleStream.api': 'Модулът {id} изисква API за модули {range}, този клиент поддържа {have}: пропуснат',
  'moduleStream.download': 'Модулът {id} не можа да се изтегли: пропуснат',
  'moduleStream.hash': 'Модулът {id} не съвпада с хеша си: пропуснат',
  'moduleStream.core': 'Модулът {id} твърди, че е основен модул: отказан',
  'moduleStream.builtIn': 'Модулът {id} носи името на вграден модул: отказан',
  'moduleStream.declined': 'Модулът {id} не беше разрешен: пропуснат',
  'moduleStream.failed': 'Модулът {id} не успя да стартира: премахнат',
} satisfies Partial<Record<keyof typeof en, string>>;
