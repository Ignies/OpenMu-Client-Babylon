/** Russian text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': 'Правый клик закрепит карту вверху списка',
  'moveList.title': 'Список перемещений',
  'warp.map': 'Карта',
  'warp.minLevel': 'Мин. ур.',
  'warp.cost': 'Цена',
} satisfies Partial<Record<keyof typeof en, string>>;
