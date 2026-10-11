/** Korean text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': '시스템 (Esc)',
  'windowMenu.help': '도움말 (F1)',
  'windowMenu.guild': '길드 (G)',
  'windowMenu.move': '이동 (M)',
  'windowMenu.map': '지도 (Tab)',
  'windowMenu.gens': '겐스 정보 (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
