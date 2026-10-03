/** Chinese text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': '内侧',
  'options.linePlacement.centered': '居中',
  'options.linePlacement.outset': '外侧',
  'options.outlineMode.screen': '屏幕空间',
  'options.outlineMode.hull': '反向外壳',
  'options.outlineMode.both': '两者',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': '角色',
  'options.style.classic': '经典',
  'options.style.cel': '卡通渲染',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
