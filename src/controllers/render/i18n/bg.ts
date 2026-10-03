/** Bulgarian text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Отвътре',
  'options.linePlacement.centered': 'Центрирани',
  'options.linePlacement.outset': 'Отвън',
  'options.outlineMode.screen': 'Екранен',
  'options.outlineMode.hull': 'Обърната обвивка',
  'options.outlineMode.both': 'И двете',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Герои',
  'options.style.classic': 'Класически',
  'options.style.cel': 'Cel-шейдинг',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
