/** el text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Εσωτερικά',
  'options.linePlacement.centered': 'Στο κέντρο',
  'options.linePlacement.outset': 'Εξωτερικά',
  'options.outlineMode.screen': 'Χώρος οθόνης',
  'options.outlineMode.hull': 'Ανεστραμμένο κέλυφος',
  'options.outlineMode.both': 'Και τα δύο',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Χαρακτήρες',
  'options.style.classic': 'Κλασικό',
  'options.style.cel': 'Cel-shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
