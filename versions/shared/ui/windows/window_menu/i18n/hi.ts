/** hi text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'सिस्टम (Esc)',
  'windowMenu.help': 'मदद (F1)',
  'windowMenu.guild': 'गिल्ड (G)',
  'windowMenu.move': 'वार्प (M)',
  'windowMenu.map': 'नक्शा (Tab)',
  'windowMenu.gens': 'Gens जानकारी (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
