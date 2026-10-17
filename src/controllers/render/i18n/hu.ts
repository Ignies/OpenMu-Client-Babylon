/** hu text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Belül',
  'options.linePlacement.centered': 'Középen',
  'options.linePlacement.outset': 'Kívül',
  'options.outlineMode.screen': 'Képernyőtér',
  'options.outlineMode.hull': 'Fordított burok',
  'options.outlineMode.both': 'Mindkettő',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Karakterek',
  'options.style.classic': 'Klasszikus',
  'options.style.cel': 'Cel-shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
