/** uk text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'Цей світ указує модуль, який не вдається прочитати ({id}): пропущено',
  'moduleStream.api':
    'Модулю {id} потрібен API модулів {range}, а цей клієнт надає {have}: пропущено',
  'moduleStream.download': 'Не вдалося завантажити модуль {id}: пропущено',
  'moduleStream.hash': 'Модуль {id} не збігається зі своїм хешем: пропущено',
  'moduleStream.core': 'Модуль {id} видає себе за модуль ядра: відхилено',
  'moduleStream.builtIn': 'Модуль {id} має назву вбудованого модуля: відхилено',
  'moduleStream.declined': 'Модуль {id} не дозволено: пропущено',
  'moduleStream.failed': 'Модуль {id} не запустився: вивантажено',
} satisfies Partial<Record<keyof typeof en, string>>;
