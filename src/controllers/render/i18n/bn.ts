/** bn text of `src/controllers/render`. */

import type en from './en';

export default {
  'options.linePlacement.inset': 'ভেতরে',
  'options.linePlacement.centered': 'মাঝখানে',
  'options.linePlacement.outset': 'বাইরে',
  'options.outlineMode.screen': 'স্ক্রিন-স্পেস',
  'options.outlineMode.hull': 'উল্টানো খোলস',
  'options.outlineMode.both': 'দুটোই',
  'options.style.anime2': 'অ্যানিমে 2.0',
  'options.quality.characters': 'চরিত্র',
  'options.style.classic': 'ক্লাসিক',
  'options.style.cel': 'সেল-শেডেড',
  'options.style.anime': 'অ্যানিমে 1.0',
} satisfies Partial<Record<keyof typeof en, string>>;
