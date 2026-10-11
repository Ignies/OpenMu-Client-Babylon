/** Romanian text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'Sistem (Esc)',
  'windowMenu.help': 'Ajutor (F1)',
  'windowMenu.guild': 'Breaslă (G)',
  'windowMenu.move': 'Mutare (M)',
  'windowMenu.map': 'Hartă (Tab)',
  'windowMenu.gens': 'Info Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
