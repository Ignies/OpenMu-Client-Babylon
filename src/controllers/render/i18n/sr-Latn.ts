/** sr-Latn text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Unutra',
  'options.linePlacement.centered': 'U sredini',
  'options.linePlacement.outset': 'Spolja',
  'options.outlineMode.screen': 'Ekranski',
  'options.outlineMode.hull': 'Obrnuti omotač',
  'options.outlineMode.both': 'Oba',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Likovi',
  'options.style.classic': 'Klasičan',
  'options.style.cel': 'Cel-shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
