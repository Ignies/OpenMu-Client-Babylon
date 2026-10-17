/** id text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'Sistem (Esc)',
  'windowMenu.help': 'Bantuan (F1)',
  'windowMenu.guild': 'Guild (G)',
  'windowMenu.move': 'Pindah (M)',
  'windowMenu.map': 'Peta (Tab)',
  'windowMenu.gens': 'Info Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
