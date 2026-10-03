/** Polish text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': 'Prawy klik, aby oznaczyć tę mapę gwiazdką i trzymać ją na górze',
  'moveList.title': 'Lista celów',
  'warp.map': 'Mapa',
  'warp.minLevel': 'Min. poz.',
  'warp.cost': 'Koszt',
} satisfies Partial<Record<keyof typeof en, string>>;
