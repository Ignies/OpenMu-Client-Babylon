/** cs text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Uvnitř',
  'options.linePlacement.centered': 'Na středu',
  'options.linePlacement.outset': 'Vně',
  'options.outlineMode.screen': 'Obrazovkový',
  'options.outlineMode.hull': 'Obrácený obal',
  'options.outlineMode.both': 'Oba',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Postavy',
  'options.style.classic': 'Klasický',
  'options.style.cel': 'Cel shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
