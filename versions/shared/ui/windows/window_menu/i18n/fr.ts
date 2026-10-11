/** French text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'Système (Esc)',
  'windowMenu.help': 'Aide (F1)',
  'windowMenu.guild': 'Guilde (G)',
  'windowMenu.move': 'Déplacer (M)',
  'windowMenu.map': 'Carte (Tab)',
  'windowMenu.gens': 'Info Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
