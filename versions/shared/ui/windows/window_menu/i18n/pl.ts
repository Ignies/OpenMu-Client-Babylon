/** Polish text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'System (Esc)',
  'windowMenu.help': 'Pomoc (F1)',
  'windowMenu.guild': 'Gildia (G)',
  'windowMenu.move': 'Przenieś (M)',
  'windowMenu.map': 'Mapa (Tab)',
  'windowMenu.gens': 'Info Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
