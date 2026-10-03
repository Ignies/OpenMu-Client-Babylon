/** Italian text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': 'Clic destro per fissare questa mappa in alto',
  'moveList.title': 'Lista delle destinazioni',
  'warp.map': 'Mappa',
  'warp.minLevel': 'Lv. min.',
  'warp.cost': 'Costo',
} satisfies Partial<Record<keyof typeof en, string>>;
