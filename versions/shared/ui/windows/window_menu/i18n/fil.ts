/** fil text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'Sistema (Esc)',
  'windowMenu.help': 'Tulong (F1)',
  'windowMenu.guild': 'Guild (G)',
  'windowMenu.move': 'Lumipat (M)',
  'windowMenu.map': 'Mapa (Tab)',
  'windowMenu.gens': 'Impormasyon ng Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
