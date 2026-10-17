/** bn text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'সিস্টেম (Esc)',
  'windowMenu.help': 'সাহায্য (F1)',
  'windowMenu.guild': 'গিল্ড (G)',
  'windowMenu.move': 'স্থানান্তর (M)',
  'windowMenu.map': 'ম্যাপ (Tab)',
  'windowMenu.gens': 'Gens তথ্য (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
