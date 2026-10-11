/** Thai text of the `render` controller. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'ด้านใน',
  'options.linePlacement.centered': 'ตรงกลาง',
  'options.linePlacement.outset': 'ด้านนอก',
  'options.outlineMode.screen': 'บนหน้าจอ',
  'options.outlineMode.hull': 'เปลือกกลับด้าน',
  'options.outlineMode.both': 'ทั้งสอง',
  'options.style.anime2': 'Anime 2.0',
  'options.quality.characters': 'ตัวละคร',
  'options.style.classic': 'คลาสสิก',
  'options.style.cel': 'เซลเชด',
  'options.style.anime': 'Anime 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
