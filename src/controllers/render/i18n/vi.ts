/** Vietnamese text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'Bên trong',
  'options.linePlacement.centered': 'Ở giữa',
  'options.linePlacement.outset': 'Bên ngoài',
  'options.outlineMode.screen': 'Theo màn hình',
  'options.outlineMode.hull': 'Vỏ đảo ngược',
  'options.outlineMode.both': 'Cả hai',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'Nhân vật',
  'options.style.classic': 'Cổ điển',
  'options.style.cel': 'Cel-shading',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
