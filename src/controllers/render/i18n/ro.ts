/** Romanian text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Interior',
  'options.linePlacement.centered': 'Centrat',
  'options.linePlacement.outset': 'Exterior',
  'options.outlineMode.screen': 'Pe ecran',
  'options.outlineMode.hull': 'Înveliș inversat',
  'options.outlineMode.both': 'Ambele',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Personaje',
  'options.style.classic': 'Clasic',
  'options.style.cel': 'Cel-shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
