/** Spanish text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'Este mundo lista un módulo que no se puede leer ({id}): omitido',
  'moduleStream.api': 'El módulo {id} necesita la API de módulos {range}, este cliente ofrece {have}: omitido',
  'moduleStream.download': 'No se pudo descargar el módulo {id}: omitido',
  'moduleStream.hash': 'El módulo {id} no coincide con su hash: omitido',
  'moduleStream.core': 'El módulo {id} dice ser un módulo base: rechazado',
  'moduleStream.builtIn': 'El módulo {id} tiene el nombre de un módulo integrado: rechazado',
  'moduleStream.declined': 'El módulo {id} no fue permitido: omitido',
  'moduleStream.failed': 'El módulo {id} no pudo iniciarse: descargado',
} satisfies Partial<Record<keyof typeof en, string>>;
