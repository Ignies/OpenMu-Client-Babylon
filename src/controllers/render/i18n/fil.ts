/** fil text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Sa loob',
  'options.linePlacement.centered': 'Nasa gitna',
  'options.linePlacement.outset': 'Sa labas',
  'options.outlineMode.screen': 'Screen-space',
  'options.outlineMode.hull': 'Baligtad na hull',
  'options.outlineMode.both': 'Pareho',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Mga karakter',
  'options.style.classic': 'Klasiko',
  'options.style.cel': 'Cel-shaded',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
