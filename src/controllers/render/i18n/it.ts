/** Italian text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Interna',
  'options.linePlacement.centered': 'Centrata',
  'options.linePlacement.outset': 'Esterna',
  'options.outlineMode.screen': 'Su schermo',
  'options.outlineMode.hull': 'Guscio invertito',
  'options.outlineMode.both': 'Entrambi',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Personaggi',
  'options.style.classic': 'Classico',
  'options.style.cel': 'Cel shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
