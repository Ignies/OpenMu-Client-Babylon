/** uk text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'Послаблення',
  'buff.remainingSec': '{seconds} с',
  'buff.remainingMin': '{minutes} хв {seconds} с',
} satisfies Partial<Record<keyof typeof en, string>>;
