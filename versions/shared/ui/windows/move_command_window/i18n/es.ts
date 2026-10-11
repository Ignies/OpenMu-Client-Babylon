/** Spanish text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': 'Clic derecho para marcar este mapa y mantenerlo arriba',
  'moveList.title': 'Lista de destinos',
  'warp.map': 'Mapa',
  'warp.minLevel': 'Nv. mín.',
  'warp.cost': 'Coste',
} satisfies Partial<Record<keyof typeof en, string>>;
