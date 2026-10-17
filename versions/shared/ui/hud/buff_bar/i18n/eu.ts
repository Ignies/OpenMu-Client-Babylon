/** eu text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'Ahulgarria',
  'buff.remainingSec': '{seconds} s',
  'buff.remainingMin': '{minutes} min {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
