/** Chinese text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': '系统 (Esc)',
  'windowMenu.help': '帮助 (F1)',
  'windowMenu.guild': '战盟 (G)',
  'windowMenu.move': '移动 (M)',
  'windowMenu.map': '地图 (Tab)',
  'windowMenu.gens': '家族信息 (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
