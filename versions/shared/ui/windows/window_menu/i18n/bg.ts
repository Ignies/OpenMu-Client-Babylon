/** Bulgarian text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'Система (Esc)',
  'windowMenu.help': 'Помощ (F1)',
  'windowMenu.guild': 'Гилдия (G)',
  'windowMenu.move': 'Преместване (M)',
  'windowMenu.map': 'Карта (Tab)',
  'windowMenu.gens': 'Инфо за Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
