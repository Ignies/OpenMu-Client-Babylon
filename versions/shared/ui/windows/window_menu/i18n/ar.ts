/** ar text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'النظام (Esc)',
  'windowMenu.help': 'المساعدة (F1)',
  'windowMenu.guild': 'النقابة (G)',
  'windowMenu.move': 'الانتقال (M)',
  'windowMenu.map': 'الخريطة (Tab)',
  'windowMenu.gens': 'معلومات Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
