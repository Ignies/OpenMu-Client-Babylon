/** hi text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'डीबफ़',
  'buff.remainingSec': '{seconds} सेकंड',
  'buff.remainingMin': '{minutes} मिनट {seconds} सेकंड',
} satisfies Partial<Record<keyof typeof en, string>>;
