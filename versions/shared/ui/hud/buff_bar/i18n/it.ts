/** Italian text of the `buff_bar` HUD element. */

import type en from './en';

export default {
  'buff.debuff': 'Malus',
  'buff.remainingSec': '{seconds} s',
  'buff.remainingMin': '{minutes} min {seconds} s',
} satisfies Partial<Record<keyof typeof en, string>>;
