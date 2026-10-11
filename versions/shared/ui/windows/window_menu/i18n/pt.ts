/** Portuguese text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'Sistema (Esc)',
  'windowMenu.help': 'Ajuda (F1)',
  'windowMenu.guild': 'Guilda (G)',
  'windowMenu.move': 'Mover (M)',
  'windowMenu.map': 'Mapa (Tab)',
  'windowMenu.gens': 'Info Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
