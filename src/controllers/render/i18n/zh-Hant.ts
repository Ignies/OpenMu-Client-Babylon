/** zh-Hant text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': '內側',
  'options.linePlacement.centered': '置中',
  'options.linePlacement.outset': '外側',
  'options.outlineMode.screen': '螢幕空間',
  'options.outlineMode.hull': '反轉外殼',
  'options.outlineMode.both': '兩者',
  'options.style.anime2': '動漫 2.0',
  'options.quality.characters': '角色',
  'options.style.classic': '經典',
  'options.style.cel': '卡通渲染',
  'options.style.anime': '動漫 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
