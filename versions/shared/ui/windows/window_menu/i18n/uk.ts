/** uk text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': 'Система (Esc)',
  'windowMenu.help': 'Довідка (F1)',
  'windowMenu.guild': 'Гільдія (G)',
  'windowMenu.move': 'Переміщення (M)',
  'windowMenu.map': 'Мапа (Tab)',
  'windowMenu.gens': 'Інформація Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
