/** Romanian text of the `move_command_window` window. */

import type en from './en';

export default {
  'warp.favouriteHint': 'Clic dreapta pentru a fixa harta în capul listei',
  'moveList.title': 'Lista de destinații',
  'warp.map': 'Hartă',
  'warp.minLevel': 'Niv. min.',
  'warp.cost': 'Cost',
} satisfies Partial<Record<keyof typeof en, string>>;
