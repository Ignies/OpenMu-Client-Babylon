/** Japanese text of the `window_menu` window. */

import type en from './en';

export default {
  'windowMenu.system': 'システム (Esc)',
  'windowMenu.help': 'ヘルプ (F1)',
  'windowMenu.guild': 'ギルド (G)',
  'windowMenu.move': '移動 (M)',
  'windowMenu.map': 'マップ (Tab)',
  'windowMenu.gens': 'ゲンス情報 (B)',
} satisfies Partial<Record<keyof typeof en, string>>;
