/** ur text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'سسٹم (Esc)',
  'windowMenu.help': 'مدد (F1)',
  'windowMenu.guild': 'گلڈ (G)',
  'windowMenu.move': 'سفر (M)',
  'windowMenu.map': 'نقشہ (Tab)',
  'windowMenu.gens': 'Gens معلومات (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
