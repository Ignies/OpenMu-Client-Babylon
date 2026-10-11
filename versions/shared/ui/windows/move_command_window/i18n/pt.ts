/** Portuguese text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': 'Clique direito para fixar este mapa no topo',
  'moveList.title': 'Lista de destinos',
  'warp.map': 'Mapa',
  'warp.minLevel': 'Nv. mín.',
  'warp.cost': 'Custo',
} satisfies Partial<Record<keyof typeof en, string>>;
