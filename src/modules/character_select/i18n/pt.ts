/** Portuguese text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'Digite mais de 4 letras',
  'characters.create.specialName': 'Não é possível usar símbolos.',
  'characters.create.reservedName': 'Esse nome está reservado.',
  'characters.create.failed':
    'Nome de personagem inválido ou já existe um com esse nome.',
} satisfies Partial<Record<keyof typeof en, string>>;
