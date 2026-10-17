/** el text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'Εξασθένηση',
  'buff.remainingSec': '{seconds} δευτ.',
  'buff.remainingMin': '{minutes} λεπ. {seconds} δευτ.',
} satisfies Partial<Record<keyof typeof en, string>>;
