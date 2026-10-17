/** ar text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'للداخل',
  'options.linePlacement.centered': 'في المنتصف',
  'options.linePlacement.outset': 'للخارج',
  'options.outlineMode.screen': 'مساحة الشاشة',
  'options.outlineMode.hull': 'الغلاف المقلوب',
  'options.outlineMode.both': 'كلاهما',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'الشخصيات',
  'options.style.classic': 'كلاسيكي',
  'options.style.cel': 'تظليل كرتوني',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
