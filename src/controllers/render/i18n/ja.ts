/** Japanese text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': '内側',
  'options.linePlacement.centered': '中央',
  'options.linePlacement.outset': '外側',
  'options.outlineMode.screen': 'スクリーン',
  'options.outlineMode.hull': '反転シェル',
  'options.outlineMode.both': '両方',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'キャラクター',
  'options.style.classic': 'クラシック',
  'options.style.cel': 'セルシェード',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
