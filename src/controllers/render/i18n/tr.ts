/** tr text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'İçte',
  'options.linePlacement.centered': 'Ortada',
  'options.linePlacement.outset': 'Dışta',
  'options.outlineMode.screen': 'Ekran alanı',
  'options.outlineMode.hull': 'Ters kabuk',
  'options.outlineMode.both': 'İkisi de',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Karakterler',
  'options.style.classic': 'Klasik',
  'options.style.cel': 'Cel-shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
