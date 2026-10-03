/** French text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Intérieur',
  'options.linePlacement.centered': 'Centrée',
  'options.linePlacement.outset': 'Extérieur',
  'options.outlineMode.screen': 'Écran',
  'options.outlineMode.hull': 'Coque inversée',
  'options.outlineMode.both': 'Les deux',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Personnages',
  'options.style.classic': 'Classique',
  'options.style.cel': 'Cel-shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
