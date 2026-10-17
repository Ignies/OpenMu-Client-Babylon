/** zh-Hant text of `versions/shared/ui/windows/window_menu`. */

import type en from './en';

export default {
  'windowMenu.system': '系統（Esc）',
  'windowMenu.help': '說明（F1）',
  'windowMenu.guild': '戰盟（G）',
  'windowMenu.move': '移動（M）',
  'windowMenu.map': '地圖（Tab）',
  'windowMenu.gens': '家族資訊（B）',
} satisfies Partial<Record<keyof typeof en, string>>;
