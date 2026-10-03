/** Russian text of the `buff_bar` HUD element. */

import type en from './en';

export default {
  'buff.debuff': 'Ослабление',
  'buff.remainingSec': '{seconds} с',
  'buff.remainingMin': '{minutes} мин {seconds} с',
} satisfies Partial<Record<keyof typeof en, string>>;
