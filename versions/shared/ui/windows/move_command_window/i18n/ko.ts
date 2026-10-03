/** Korean text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': '오른쪽 클릭으로 이 맵을 위에 고정',
  'moveList.title': '이동 목록',
  'warp.map': '맵',
  'warp.minLevel': '최소 Lv',
  'warp.cost': '비용',
} satisfies Partial<Record<keyof typeof en, string>>;
