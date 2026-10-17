/** zh-Hant text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': '減益',
  'buff.remainingSec': '{seconds}秒',
  'buff.remainingMin': '{minutes}分{seconds}秒',
} satisfies Partial<Record<keyof typeof en, string>>;
