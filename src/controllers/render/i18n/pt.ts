/** Portuguese text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Interna',
  'options.linePlacement.centered': 'Centrada',
  'options.linePlacement.outset': 'Externa',
  'options.outlineMode.screen': 'Em tela',
  'options.outlineMode.hull': 'Casca invertida',
  'options.outlineMode.both': 'Ambos',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Personagens',
  'options.style.classic': 'Clássico',
  'options.style.cel': 'Cel shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
