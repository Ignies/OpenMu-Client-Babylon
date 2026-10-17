/** hu text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'Rendszer (Esc)',
  'windowMenu.help': 'Súgó (F1)',
  'windowMenu.guild': 'Céh (G)',
  'windowMenu.move': 'Teleport (M)',
  'windowMenu.map': 'Térkép (Tab)',
  'windowMenu.gens': 'Gens infó (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
