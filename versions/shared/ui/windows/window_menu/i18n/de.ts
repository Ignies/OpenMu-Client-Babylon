/** German text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'System (Esc)',
  'windowMenu.help': 'Hilfe (F1)',
  'windowMenu.guild': 'Gilde (G)',
  'windowMenu.move': 'Reisen (M)',
  'windowMenu.map': 'Karte (Tab)',
  'windowMenu.gens': 'Gens-Info (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
