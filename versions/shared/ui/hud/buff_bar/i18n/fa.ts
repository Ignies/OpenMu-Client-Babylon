/** fa text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'تضعیف',
  'buff.remainingSec': '{seconds} ثانیه',
  'buff.remainingMin': '{minutes} دقیقه {seconds} ثانیه',
} satisfies Partial<Record<keyof typeof en, string>>;
