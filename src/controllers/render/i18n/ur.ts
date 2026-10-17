/** ur text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'اندر',
  'options.linePlacement.centered': 'درمیان',
  'options.linePlacement.outset': 'باہر',
  'options.outlineMode.screen': 'اسکرین اسپیس',
  'options.outlineMode.hull': 'الٹا خول',
  'options.outlineMode.both': 'دونوں',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'کردار',
  'options.style.classic': 'کلاسیکی',
  'options.style.cel': 'سیل شیڈڈ',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
