/** bn text of `versions/shared/ui/hud/buff_bar`. */

import type en from './en';

export default {
  'buff.debuff': 'ডিবাফ',
  'buff.remainingSec': '{seconds} সেকেন্ড',
  'buff.remainingMin': '{minutes} মিনিট {seconds} সেকেন্ড',
} satisfies Partial<Record<keyof typeof en, string>>;
