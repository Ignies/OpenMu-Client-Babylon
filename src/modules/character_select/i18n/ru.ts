/** Russian text of the `character_select` module. */

import type en from './en';

export default {
  'characters.create.minLength': 'Введите больше 4 букв',
  'characters.create.specialName': 'Символы использовать нельзя.',
  'characters.create.reservedName': 'Это имя зарезервировано.',
  'characters.create.failed':
    'Неверное имя персонажа или такое имя уже занято.',
} satisfies Partial<Record<keyof typeof en, string>>;
