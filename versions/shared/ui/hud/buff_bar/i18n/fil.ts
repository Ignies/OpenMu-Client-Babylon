/** fil text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'Debuff',
  'buff.remainingSec': '{seconds} seg',
  'buff.remainingMin': '{minutes} min {seconds} seg',
} satisfies Partial<Record<keyof typeof en, string>>;
