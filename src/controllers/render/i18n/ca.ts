/** ca text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Interior',
  'options.linePlacement.centered': 'Centrada',
  'options.linePlacement.outset': 'Exterior',
  'options.outlineMode.screen': 'A la pantalla',
  'options.outlineMode.hull': 'Malla invertida',
  'options.outlineMode.both': 'Tots dos',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Personatges',
  'options.style.classic': 'Clàssic',
  'options.style.cel': 'Cel shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
