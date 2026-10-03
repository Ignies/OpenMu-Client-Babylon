/** Japanese text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': '右クリックでこのマップを上に固定',
  'moveList.title': '移動先一覧',
  'warp.map': 'マップ',
  'warp.minLevel': '最低 Lv',
  'warp.cost': '費用',
} satisfies Partial<Record<keyof typeof en, string>>;
