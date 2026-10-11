/** Polish text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Wewnątrz',
  'options.linePlacement.centered': 'Na środku',
  'options.linePlacement.outset': 'Na zewnątrz',
  'options.outlineMode.screen': 'Ekranowy',
  'options.outlineMode.hull': 'Odwrócona powłoka',
  'options.outlineMode.both': 'Oba',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Postacie',
  'options.style.classic': 'Klasyczny',
  'options.style.cel': 'Cel-shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
