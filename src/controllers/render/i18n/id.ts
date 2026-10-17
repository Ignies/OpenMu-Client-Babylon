/** id text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Di dalam',
  'options.linePlacement.centered': 'Di tengah',
  'options.linePlacement.outset': 'Di luar',
  'options.outlineMode.screen': 'Ruang layar',
  'options.outlineMode.hull': 'Lapisan terbalik',
  'options.outlineMode.both': 'Keduanya',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Karakter',
  'options.style.classic': 'Klasik',
  'options.style.cel': 'Cel shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
