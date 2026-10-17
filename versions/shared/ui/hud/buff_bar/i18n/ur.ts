/** ur text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'منفی اثر',
  'buff.remainingSec': '{seconds} سیکنڈ',
  'buff.remainingMin': '{minutes} منٹ {seconds} سیکنڈ',
} satisfies Partial<Record<keyof typeof en, string>>;
