/** id text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'Debuff',
  'buff.remainingSec': '{seconds} dtk',
  'buff.remainingMin': '{minutes} mnt {seconds} dtk',
} satisfies Partial<Record<keyof typeof en, string>>;
