/** Bulgarian text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'Напиши повече от 4 букви',
  'characters.create.specialName': 'Не може да се използват символи.',
  'characters.create.reservedName': 'Това име е запазено.',
  'characters.create.failed':
    'Невалидно име на герой или вече съществува такова.',
} satisfies Partial<Record<keyof typeof en, string>>;
