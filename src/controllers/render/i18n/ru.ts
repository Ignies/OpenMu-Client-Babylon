/** Russian text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Внутри',
  'options.linePlacement.centered': 'По центру',
  'options.linePlacement.outset': 'Снаружи',
  'options.outlineMode.screen': 'Экранная',
  'options.outlineMode.hull': 'Инвертированная оболочка',
  'options.outlineMode.both': 'Оба',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Персонажи',
  'options.style.classic': 'Классический',
  'options.style.cel': 'Cel-шейдинг',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
