/** fa text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'سیستم (Esc)',
  'windowMenu.help': 'راهنما (F1)',
  'windowMenu.guild': 'انجمن (G)',
  'windowMenu.move': 'انتقال (M)',
  'windowMenu.map': 'نقشه (Tab)',
  'windowMenu.gens': 'اطلاعات Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
