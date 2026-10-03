/** Chinese text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': '右键收藏此地图并置顶',
  'moveList.title': '移动列表',
  'warp.map': '地图',
  'warp.minLevel': '最低等级',
  'warp.cost': '费用',
} satisfies Partial<Record<keyof typeof en, string>>;
