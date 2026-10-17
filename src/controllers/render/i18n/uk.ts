/** uk text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Всередині',
  'options.linePlacement.centered': 'По центру',
  'options.linePlacement.outset': 'Назовні',
  'options.outlineMode.screen': 'Екранне',
  'options.outlineMode.hull': 'Інвертована оболонка',
  'options.outlineMode.both': 'Обидва',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Персонажі',
  'options.style.classic': 'Класичний',
  'options.style.cel': 'Cel-шейдинг',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
