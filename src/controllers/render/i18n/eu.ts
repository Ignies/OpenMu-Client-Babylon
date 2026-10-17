/** eu text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Barruan',
  'options.linePlacement.centered': 'Erdian',
  'options.linePlacement.outset': 'Kanpoan',
  'options.outlineMode.screen': 'Pantaila-espazioa',
  'options.outlineMode.hull': 'Oskol alderantzikatua',
  'options.outlineMode.both': 'Biak',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Pertsonaiak',
  'options.style.classic': 'Klasikoa',
  'options.style.cel': 'Cel-shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
