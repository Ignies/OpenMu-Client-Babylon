/** cs text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'Systém (Esc)',
  'windowMenu.help': 'Nápověda (F1)',
  'windowMenu.guild': 'Cech (G)',
  'windowMenu.move': 'Přesun (M)',
  'windowMenu.map': 'Mapa (Tab)',
  'windowMenu.gens': 'Info Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
