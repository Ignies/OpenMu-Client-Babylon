/** French text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': 'Clic droit pour épingler cette carte en haut',
  'moveList.title': 'Liste des destinations',
  'warp.map': 'Carte',
  'warp.minLevel': 'Niv. min.',
  'warp.cost': 'Coût',
} satisfies Partial<Record<keyof typeof en, string>>;
