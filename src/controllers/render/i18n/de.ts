/** German text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Innen',
  'options.linePlacement.centered': 'Mittig',
  'options.linePlacement.outset': 'Außen',
  'options.outlineMode.screen': 'Bildschirmraum',
  'options.outlineMode.hull': 'Invertierte Hülle',
  'options.outlineMode.both': 'Beides',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Charaktere',
  'options.style.classic': 'Klassisch',
  'options.style.cel': 'Cel-Shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
