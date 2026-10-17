/** tr text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'Zayıflatma',
  'buff.remainingSec': '{seconds} sn',
  'buff.remainingMin': '{minutes} dk {seconds} sn',
} satisfies Partial<Record<keyof typeof en, string>>;
