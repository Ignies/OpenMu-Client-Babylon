/** German text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': 'Rechtsklick markiert diese Karte und hält sie oben',
  'moveList.title': 'Zielliste',
  'warp.map': 'Karte',
  'warp.minLevel': 'Min. Lv.',
  'warp.cost': 'Kosten',
} satisfies Partial<Record<keyof typeof en, string>>;
