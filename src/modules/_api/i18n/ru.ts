/** Russian text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'Этот мир указывает модуль, который нельзя прочитать ({id}): пропущен',
  'moduleStream.api': 'Модулю {id} нужен API модулей {range}, этот клиент поддерживает {have}: пропущен',
  'moduleStream.download': 'Не удалось загрузить модуль {id}: пропущен',
  'moduleStream.hash': 'Модуль {id} не совпадает со своим хешем: пропущен',
  'moduleStream.core': 'Модуль {id} выдаёт себя за основной: отклонён',
  'moduleStream.builtIn': 'Модуль {id} носит имя встроенного модуля: отклонён',
  'moduleStream.declined': 'Модуль {id} не разрешён: пропущен',
  'moduleStream.failed': 'Модуль {id} не запустился: выгружен',
} satisfies Partial<Record<keyof typeof en, string>>;
