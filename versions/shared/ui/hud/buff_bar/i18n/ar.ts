/** ar text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'إضعاف',
  'buff.remainingSec': '{seconds} ث',
  'buff.remainingMin': '{minutes} د {seconds} ث',
} satisfies Partial<Record<keyof typeof en, string>>;
