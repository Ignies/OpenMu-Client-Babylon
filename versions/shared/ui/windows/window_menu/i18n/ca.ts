/** ca text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'Sistema (Esc)',
  'windowMenu.help': 'Ajuda (F1)',
  'windowMenu.guild': 'Gremi (G)',
  'windowMenu.move': 'Teletransport (M)',
  'windowMenu.map': 'Mapa (Tab)',
  'windowMenu.gens': 'Info de Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
