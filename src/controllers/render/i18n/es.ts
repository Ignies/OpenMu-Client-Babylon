/** Spanish text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Interior',
  'options.linePlacement.centered': 'Centrada',
  'options.linePlacement.outset': 'Exterior',
  'options.outlineMode.screen': 'En pantalla',
  'options.outlineMode.hull': 'Malla invertida',
  'options.outlineMode.both': 'Ambos',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Personajes',
  'options.style.classic': 'Clásico',
  'options.style.cel': 'Cel shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
