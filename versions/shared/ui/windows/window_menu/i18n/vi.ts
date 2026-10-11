/** Vietnamese text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'Hệ thống (Esc)',
  'windowMenu.help': 'Trợ giúp (F1)',
  'windowMenu.guild': 'Bang hội (G)',
  'windowMenu.move': 'Di chuyển (M)',
  'windowMenu.map': 'Bản đồ (Tab)',
  'windowMenu.gens': 'Thông tin Gens (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
