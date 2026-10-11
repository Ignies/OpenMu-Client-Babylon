/** Italian text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'Sistema (Esc)',
  'windowMenu.help': 'Aiuto (F1)',
  'windowMenu.guild': 'Gilda (G)',
  'windowMenu.move': 'Sposta (M)',
  'windowMenu.map': 'Mappa (Tab)',
  'windowMenu.gens': 'Info Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
