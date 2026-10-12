/** Portuguese text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'Este mundo lista um módulo que não pode ser lido ({id}): ignorado',
  'moduleStream.api': 'O módulo {id} precisa da API de módulos {range}, este cliente oferece {have}: ignorado',
  'moduleStream.download': 'Não foi possível baixar o módulo {id}: ignorado',
  'moduleStream.hash': 'O módulo {id} não confere com seu hash: ignorado',
  'moduleStream.core': 'O módulo {id} diz ser um módulo base: recusado',
  'moduleStream.builtIn': 'O módulo {id} tem o nome de um módulo embutido: recusado',
  'moduleStream.declined': 'O módulo {id} não foi permitido: ignorado',
  'moduleStream.failed': 'O módulo {id} não conseguiu iniciar: descarregado',
} satisfies Partial<Record<keyof typeof en, string>>;
