/** Spanish text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'Escribe más de 4 letras',
  'characters.create.specialName': 'No se pueden usar símbolos.',
  'characters.create.reservedName': 'Ese nombre está reservado.',
  'characters.create.failed':
    'El nombre no es válido o ya existe un personaje con ese nombre.',
} satisfies Partial<Record<keyof typeof en, string>>;
