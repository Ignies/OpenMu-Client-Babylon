/** sr-Latn text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'Oslabljenje',
  'buff.remainingSec': '{seconds} sek.',
  'buff.remainingMin': '{minutes} min. {seconds} sek.',
} satisfies Partial<Record<keyof typeof en, string>>;
