/** Chinese text of the `buff_bar` HUD element. */

import type en from './en';

export default {
  'buff.debuff': '负面效果',
  'buff.remainingSec': '{seconds} 秒',
  'buff.remainingMin': '{minutes} 分 {seconds} 秒',
} satisfies Partial<Record<keyof typeof en, string>>;
