/** tr text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'Sistem (Esc)',
  'windowMenu.help': 'Yardım (F1)',
  'windowMenu.guild': 'Lonca (G)',
  'windowMenu.move': 'Işınlan (M)',
  'windowMenu.map': 'Harita (Tab)',
  'windowMenu.gens': 'Gens Bilgisi (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
