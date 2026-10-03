/** Bulgarian text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': 'Десен бутон закача картата най-отгоре',
  'moveList.title': 'Списък с места',
  'warp.map': 'Карта',
  'warp.minLevel': 'Мин. нв.',
  'warp.cost': 'Цена',
} satisfies Partial<Record<keyof typeof en, string>>;
