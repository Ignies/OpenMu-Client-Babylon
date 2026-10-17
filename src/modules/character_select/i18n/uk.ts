/** uk text of `src/modules/character_select`. */

import type en from './en';

export default {
  'characters.create.minLength': 'Введіть понад 4 літери',
  'characters.create.specialName': 'Не можна використовувати символи.',
  'characters.create.reservedName': 'Це ім’я зарезервовано.',
  'characters.create.failed': 'Введено неправильне ім’я персонажа, або таке ім’я вже існує.',
} satisfies Partial<Record<keyof typeof en, string>>;
