/** fa text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'داخلی',
  'options.linePlacement.centered': 'میانی',
  'options.linePlacement.outset': 'بیرونی',
  'options.outlineMode.screen': 'فضای صفحه',
  'options.outlineMode.hull': 'پوسته وارونه',
  'options.outlineMode.both': 'هر دو',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'کاراکترها',
  'options.style.classic': 'کلاسیک',
  'options.style.cel': 'سل‌شید',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
