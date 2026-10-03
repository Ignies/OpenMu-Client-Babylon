/** Vietnamese text of the `buff_bar` HUD element. */

import type en from './en';

export default {
  'buff.debuff': 'Bất lợi',
  'buff.remainingSec': '{seconds} giây',
  'buff.remainingMin': '{minutes} phút {seconds} giây',
} satisfies Partial<Record<keyof typeof en, string>>;
